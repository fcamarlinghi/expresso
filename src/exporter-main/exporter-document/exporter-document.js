
import nodePath from 'path';
import fs from 'fs';

import CEP from 'core/CEP.js';
import Extension, { defaultLogger as logger } from 'core/Extension.js';
import FileSystem from 'core/FileSystem.js';
import SlowTask from 'core/SlowTask.js';

import CorePhotoshopDocument from 'photoshop/ui/photoshop-document/photoshop-document.js'
import ExporterTarget from '../exporter-target/exporter-target.js';

/**
 * Exporter document.
 */
export default CorePhotoshopDocument.extend({

    template: require('./exporter-document.html'),

    components: {
        'exporter-target': ExporterTarget,
    },

    data: function ()
    {
        return {

            /**
             * Data schema version.
             * @type Number
             * @default 1
             */
            v: 1,

            /**
             * Name of the datakey to get from document XMP metadata.
             * @type String
             * @default 'exporter'
             */
            key: 'exporter',

            /**
             * Export path.
             * @type String
             * @default ''
             */
            path: '',

            /**
             * Export targets.
             * @type Array
             * @default []
             */
            targets: [],

        }
    },

    /**
     * Called on component initialization.
     * @private
     */
    oninit: function ()
    {
        this._super();

        // Observe model changes
        this.observe('path targets.*', this.modelUpdated, { init: false });
        this.observe('targets.*.channels.* targets.*.filters.* targets.*.normal.*', this.modelUpdated, { init: false });
    },

    /** 
     * Serializes document data (called when document is being saved).
     * @protected
     */
    serialize: function ()
    {
        return JSON.stringify({ v: this.get('v'), path: this.get('path'), targets: this.get('targets') });
    },

    /** 
     * Deserializes document data (called when document data has been loaded).
     * @protected
     */
    deserialize: function (data)
    {
        if (String.isEmpty(data))
        {
            return null;
        }
        else
        {
            let parsed = JSON.parse(data);

            if (!parsed.v)
            {
                // Upgrade storage to version 1
                parsed.v = 1;

                parsed.path = parsed.exportPath;
                delete parsed.exportPath;

                parsed.targets = parsed.maps;
                delete parsed.maps;

                if (parsed.targets)
                {
                    parsed.targets.map(target =>
                    {
                        target.path = target.exportPath;
                        delete target.exportPath;

                        target.scale = target.size;
                        delete target.size;

                        return target;
                    });
                }
            }

            this.set('path', parsed.path || '');
            this.set('targets', parsed.targets || []);

            return parsed;
        }
    },

    /**
     * Adds a new target.
     * @private
     */
    addTarget: function ()
    {
        this.push('targets', {

            // General
            expanded: true,
            suffix: '',
            scale: 1,
            format: 'tga',
            enabled: true,

            // Channels
            channelsLocked: true,
            channels: [-1, -1, -1, -1],

            // Export
            pathLocked: true,
            path: '.\\',

            // Filters
            filters: {
                blur: false,
                sharpen: false,
                invert: false,
            },

            // Normal maps
            normal: {
                normalize: false,
                flipX: false,
                flipY: false,
            },

        });
    },

    /**
     * Gets a valid save folder.
     * @private
     */
    getSaveFolder: function (basePath, savePath)
    {
        let folder;

        // If user did not specify a path, fallback to relative path
        if (String.isEmpty(savePath))
        {
            savePath = './';
        }

        // Check for relative path
        if (savePath.charAt(0) === '.')
        {
            // If document has not been saved, do not allow exporting with relative paths
            if (String.isEmpty(basePath))
            {
                throw new Error('You need to save the document before exporting using a relative path.');
            }

            folder = nodePath.join(basePath, savePath);
            logger.debug(`Export folder is relative to document path ${folder} (${savePath})`);
        }
        else
        {
            folder = savePath;
        }

        // Make sure folder path is normalized
        folder = nodePath.normalize(folder);

        // Now try to locate the folder on disk			
        if (!fs.existsSync(folder))
        {
            // Folder does not exist, try to create it
            logger.info(`Export folder ${folder} does not exists, trying to create it...`);

            window.cep.fs.makedir(folder);

            if (!fs.existsSync(folder))
            {
                throw new Error(`Invalid export path "${folder}": folder does not exists and could not be created.`);
            }
        }

        return folder;
    },

    /**
     * Exports all targets.
     * @private
     */
    exportAll: function ()
    {
        if (SlowTask.isInProgress() || this.get('targets').length === 0)
        {
            return Promise.resolve();
        }
        else
        {
            return Promise.try(() =>
            {
                SlowTask.start('Exporting all targets...');

                // Get document path
                return Extension.get().photoshop.getDocumentPath();

            }).then(documentPath =>
            {
                // Export targets
                const options = this.getExportOptions();
                let targets = JSON.parse(JSON.stringify(this.get('targets'))); // Poor man copy
                this.resolveExportPaths(targets, documentPath);
                return Extension.get().imageExporter.run(targets, options);

            }).catch(error =>
            {
                const msg = `Unable to export targets. ${error.message}`;

                if (RELEASE)
                {
                    CEP.alert(msg);
                }

                logger.error(msg);

            }).finally(() =>
            {
                SlowTask.complete();
            });
        }
    },

    /**
     * Exports enabled targets.
     * @private
     */
    exportEnabled: function ()
    {
        if (SlowTask.isInProgress() || this.get('targets').length === 0)
        {
            return Promise.resolve();
        }
        else
        {
            return Promise.try(() =>
            {
                SlowTask.start('Exporting selected targets...');

                // Get document path
                return Extension.get().photoshop.getDocumentPath();

            }).then(documentPath =>
            {
                // Export targets (only enabled ones)
                let targets = JSON.parse(JSON.stringify(this.get('targets'))); // Poor man copy
                targets = targets.filter(function (target) { return target.enabled; });

                if (targets.length === 0)
                {
                    throw new Error('No target selected.');
                }

                this.resolveExportPaths(targets, documentPath);
                const options = this.getExportOptions();
                return Extension.get().imageExporter.run(targets, options);

            }).catch(error =>
            {
                const msg = `Unable to export selected targets. ${error.message}`;

                if (RELEASE)
                {
                    CEP.alert(msg);
                }

                logger.error(msg);

            }).finally(() =>
            {
                SlowTask.complete();
            });
        }
    },

    /**
     * Exports a single target.
     * @private
     */
    exportTarget: function (index)
    {
        if (SlowTask.isInProgress() || index < 0 || index >= this.get('targets').length)
        {
            return Promise.resolve();
        }
        else
        {
            let suffix = this.get('targets')[index].suffix;
            if (!String.isEmpty(suffix))
            {
                suffix = ' "' + suffix + '"';
            }

            return Promise.try(() =>
            {
                SlowTask.start(`Exporting target${suffix}...`);

                // Get document path
                return Extension.get().photoshop.getDocumentPath();

            }).then(documentPath =>
            {
                // Export specified target
                const options = this.getExportOptions();
                let targets = [JSON.parse(JSON.stringify(this.get('targets')[index]))]; // Poor man copy
                this.resolveExportPaths(targets, documentPath);
                return Extension.get().imageExporter.run(targets, options);

            }).catch(error =>
            {
                const msg = `Unable to export${suffix}. ${error.message}`;

                if (RELEASE)
                {
                    CEP.alert(msg);
                }

                logger.error(msg);

            }).finally(() =>
            {
                SlowTask.complete();
            });
        }
    },

    /**
     * Resolves export paths for the specified array of targets. WARNING: modifies the original array!
     * @private
     */
    resolveExportPaths: function (targets, documentPath)
    {
        // Get document folder, filename without extension and resolve global
        // export path as it might come in handy while building export targets
        let basePath = (documentPath === null) ? '' : nodePath.dirname(documentPath),
            documentFileName = (documentPath === null) ? 'UnsavedDocument' : nodePath.basename(documentPath, nodePath.extname(documentPath));

        if (Extension.get().settings.get('useLowerCaseFileNames'))
        {
            documentFileName = documentFileName.toLowerCase();
        }

        const globalTargetFolder = this.getSaveFolder(basePath, this.get('path'));

        // Resolve export paths
        targets.forEach(target =>
        {
            var targetFolder = (target.pathLocked) ? globalTargetFolder : this.getSaveFolder(basePath, target.path),
                targetFile = documentFileName + target.suffix,
                targetExtension = (Extension.get().settings.get('useLowerCaseExtension')) ? target.format.toLowerCase() : target.format.toUpperCase();

            target.path = nodePath.join(targetFolder, targetFile + '.' + targetExtension);

        });
    },

    /**
     * Selects the global export path.
     * @private
     */
    selectGlobalPath: function ()
    {
        return Promise.try(() =>
        {
            // Get document path
            return Extension.get().photoshop.getDocumentPath();

        }).then(documentPath =>
        {
            // Get open folder parameters
            var initialPath = this.get('path'),
                parsedDocumentPath = (documentPath !== null) ? nodePath.dirname(documentPath) : null;

            return {
                title: 'Select export folder...',
                initialPath: String.isEmpty(initialPath) ? parsedDocumentPath : initialPath,
                basePath: parsedDocumentPath,
                convertToRelative: Extension.get().settings.get('useRelativePaths'),
            };

        }).then(params =>
        {
            // Let user select the new export path
            return FileSystem.showOpenFolderDialog(params.title, params.initialPath, params.basePath, params.convertToRelative);

        }).then(exportPath =>
        {
            if (!String.isEmpty(exportPath))
            {
                this.set('path', exportPath);
            }

        }).catch(error =>
        {
            const msg = `Error while selecting global export path. ${error.message}`;

            if (RELEASE)
            {
                CEP.alert(msg);
            }

            logger.error(msg);

        });
    },

    /**
     * Gets the export options from plugin settings.
     * @private
     */
    getExportOptions: function ()
    {
        const settings = Extension.get().settings;
        
        return {
            enableTGACompression: settings.get('enableTGACompression')
        };
    },

});
