
import Ractive from 'ractive';
import { application } from 'core';
import ExporterDocument from '../exporter-document/exporter-document.js';
import './exporter-panel.less';

/**
 * The Expresso Exporter panel.
 */
export default Ractive.components['core-panel'].extend({

    partials: {

        panel: require('./exporter-panel.html'),

    },

    on: {

        /**
         * Called when the "Add Target" button is pressed.
         * @private
         */
        addTarget: function ()
        {
            if (this.get('hasActiveDocument'))
            {
                this.get('activeDocument').addTarget();
            }
        },

        /**
         * Called when the "Export All" button is pressed.
         * @private
         */
        exportAll: function ()
        {
            if (this.get('hasActiveDocument'))
            {
                this.get('activeDocument').exportAll();
            }
        },

        /**
         * Called when the "Export Enabled" button is pressed.
         * @private
         */
        exportEnabled: function ()
        {
            if (this.get('hasActiveDocument'))
            {
                this.get('activeDocument').exportEnabled();
            }
        },

    },

    /**
     * Called on component initialization.
     * @private
     */
    oninit: function ()
    {
        this._super();

        // Load settings
        application.settings.load({
            useLowerCaseExtension: true,
            useLowerCaseFileNames: false,
            saveOriginalAfterExport: false,
            useRelativePaths: true,
        });

        // Setup the flyout menu
        application.cep.setPanelFlyoutMenu({

            menu: [
                { label: application.extension.name + ' ' + application.info.version, enabled: false },
                { label: '---' },
                { id: 'useLowerCaseExtension', label: 'Use lower case file extensions', checkable: true, checked: application.settings.get('useLowerCaseExtension') },
                { id: 'useLowerCaseFileNames', label: 'Use lower case file names', checkable: true, checked: application.settings.get('useLowerCaseFileNames') },
                { id: 'saveOriginalAfterExport', label: 'Auto-save original document after export', checkable: true, checked: application.settings.get('saveOriginalAfterExport') },
                { id: 'useRelativePaths', label: 'Use relative export paths when possible', checkable: true, checked: application.settings.get('useRelativePaths') },
                { label: '---' },
                { id: 'openLogFolder', label: 'View Logs' },
                { id: 'openWebsite', label: 'Website' }
            ],

        });

        application.cep.addEventListener('com.adobe.csxs.events.flyoutMenuClicked', (event) =>
        {
            if (event && event.data && event.data.menuId && event.data.menuName)
            {
                if (event.data.menuId === 'openWebsite')
                {
                    application.cep.openURLInDefaultBrowser(WEBSITE);
                }
                else if (event.data.menuId === 'openLogFolder')
                {
                    application.cep.evalScript('Folder(params.logFolderPath).execute()', { logFolderPath: application.folders.logs });
                }
                else
                {
                    application.settings.toggle(event.data.menuId);
                    application.cep.updatePanelMenuItem(event.data.menuName, true, application.settings.get(event.data.menuId));
                }
            }
        });
    },

    /** 
     * Creates the Javascript representation of a Photoshop document.
     * @param {Number} documentId Photoshop document ID.
     * @private
     */
    createDocumentModel: function (documentId)
    {
        return new ExporterDocument({

            data: {
                documentId: documentId,
            },

        });
    },

});
