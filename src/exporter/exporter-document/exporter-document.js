
import Ractive from 'ractive';
import nodePath from 'path';
import fs from 'fs';

import { application } from 'core';
import ExporterTarget from '../exporter-target/exporter-target.js';

/**
 * Exporter document.
 */
export default Ractive.components['core-document'].extend({

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
        this.on('selectGlobalPath', this.selectGlobalPath);

        // Observe model changes
        this.observe('path targets.*', this.modelUpdated, { init: false });
        this.observe('targets.*.channels.* targets.*.filters.* targets.*.normal.*', this.modelUpdated, { init: false });
    },

    /** 
     * Serializes document data (called when document is being saved).
     * @private
     */
    serialize: function ()
    {
        return JSON.stringify({ v: this.get('v'), path: this.get('path'), targets: this.get('targets') });
    },

    /** 
     * Deserializes document data (called when document data has been loaded).
     * @private
     */
    deserialize: function (data)
    {
        if (String.isEmpty(data))
        {
            return null;
        }
        else
        {
            var parsed = JSON.parse(data);

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
                    parsed.targets.map(function (target)
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
     * Selects global export path.
     * @private
     */
    selectGlobalPath: function ()
    {
        return Promise.bind(this).then(function ()
        {
            // Get document path
            return application.photoshop.getDocumentPath();

        }).then(function (documentPath)
        {
            // Get open folder parameters
            var initialPath = this.get('path'),
                parsedDocumentPath = (documentPath !== null) ? nodePath.dirname(documentPath) : null;

            return {
                title: 'Select export folder...',
                initialPath: String.isEmpty(initialPath) ? parsedDocumentPath : initialPath,
                basePath: parsedDocumentPath,
                convertToRelative: application.settings.get('useRelativePaths'),
            };

        }).then(function (params)
        {
            // Let user select the new export path
            return application.fs.showOpenFolderDialog(params.title, params.initialPath, params.basePath, params.convertToRelative);

        }).then(function (exportPath)
        {
            if (!String.isEmpty(exportPath))
            {
                this.set('path', exportPath);
            }

        }).catch(function (error)
        {
            const msg = `Error while selecting global export path. ${error.message}`;

            if (RELEASE)
            {
                application.cep.alert(msg);
            }

            application.logger.error(msg);

        });
    },

    /**
     * Gets a valid save folder.
     * @private
     */
    getSaveFolder: function (basePath, savePath)
    {
        var folder;

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
            application.logger.debug(`Export folder is relative to document path ${folder} (${savePath})`);
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
            application.logger.info(`Export folder ${folder} does not exists, trying to create it...`);

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
        if (application.ui.isBusy() || this.get('targets').length === 0)
        {
            return Promise.resolve();
        }
        else
        {
            return Promise.bind(this).then(function ()
            {
                // Get document path
                return application.photoshop.getDocumentPath();

            }).then(function (documentPath)
            {
                application.ui.setBusy(true, 'Exporting all targets...');

                // Export targets
                var targets = JSON.parse(JSON.stringify(this.get('targets'))); // Poor man copy
                this.resolveExportPaths(targets, documentPath);
                return application.imageExporter.run(targets);

            }).catch(function (error)
            {
                const msg = `Unable to export targets. ${error.message}`;

                if (RELEASE)
                {
                    application.cep.alert(msg);
                }

                application.logger.error(msg);

            }).finally(function ()
            {
                application.ui.setBusy(false);
            });
        }
    },

    /**
     * Exports enabled targets.
     * @private
     */
    exportEnabled: function ()
    {
        if (application.ui.isBusy() || this.get('targets').length === 0)
        {
            return Promise.resolve();
        }
        else
        {
            return Promise.bind(this).then(function ()
            {
                // Get document path
                return application.photoshop.getDocumentPath();

            }).then(function (documentPath)
            {
                application.ui.setBusy(true, 'Exporting selected targets...');

                // Export targets (only the enabled ones)
                var targets = JSON.parse(JSON.stringify(this.get('targets'))); // Poor man copy
                targets = targets.filter(function (target) { return target.enabled; });
                this.resolveExportPaths(targets, documentPath);
                return application.imageExporter.run(targets);

            }).catch(function (error)
            {
                const msg = `Unable to export selected targets. ${error.message}`;

                if (RELEASE)
                {
                    application.cep.alert(msg);
                }

                application.logger.error(msg);

            }).finally(function ()
            {
                application.ui.setBusy(false);
            });
        }
    },

    /**
     * Exports a single target.
     * @private
     */
    exportTarget: function (index)
    {
        if (application.ui.isBusy() || index < 0 || index >= this.get('targets').length)
        {
            return Promise.resolve();
        }
        else
        {
            var suffix = this.get('targets')[index].suffix;

            if (!String.isEmpty(suffix))
            {
                suffix = ' "' + suffix + '"';
            }

            return Promise.bind(this).then(function ()
            {
                // Get document path
                return application.photoshop.getDocumentPath();

            }).then(function (documentPath)
            {
                application.ui.setBusy(true, `Exporting target${suffix}...`);

                // Export specified target
                var targets = [JSON.parse(JSON.stringify(this.get('targets')[index]))]; // Poor man copy
                this.resolveExportPaths(targets, documentPath);
                return application.imageExporter.run(targets);

            }).catch(function (error)
            {
                const msg = `Unable to export${suffix}. ${error.message}`;

                if (RELEASE)
                {
                    application.cep.alert(msg);
                }

                application.logger.error(msg);

            }).finally(function ()
            {
                application.ui.setBusy(false);

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
        var basePath = (documentPath === null) ? '' : nodePath.dirname(documentPath),
            documentFileName = (documentPath === null) ? 'UnsavedDocument' : nodePath.basename(documentPath, '.psd');

        if (application.settings.get('useLowerCaseFileNames'))
        {
            documentFileName = documentFileName.toLowerCase();
        }

        var globalTargetFolder = this.getSaveFolder(basePath, this.get('path'));

        // Resolve export paths
        targets.forEach(function (target)
        {
            var targetFolder = (target.pathLocked) ? globalTargetFolder : this.getSaveFolder(basePath, target.path),
                targetFile = documentFileName + target.suffix,
                targetExtension = (application.settings.get('useLowerCaseExtension')) ? target.format.toLowerCase() : target.format.toUpperCase();

            target.path = nodePath.join(targetFolder, targetFile + '.' + targetExtension);

        }, this);
    },

});
