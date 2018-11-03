
import CEP from 'core/CEP.js';
import Extension from 'core/Extension.js';

import ExporterDocument from '../exporter-document/exporter-document.js';
import CorePhotoshopPanel from 'photoshop/ui/photoshop-panel/photoshop-panel.js'

/**
 * The Expresso Exporter panel.
 */
export default CorePhotoshopPanel.extend({

    partials: {

        panel: [],
        toolbar: require('./exporter-panel.html'),

    },

    /**
     * Called on component initialization.
     * @private
     */
    oninit: function ()
    {
        this._super();

        // Setup the flyout menu
        CEP.setPanelFlyoutMenu({

            menu: [
                { label: CEP.getExtensionInfo().name + ' ' + Extension.get().info.version, enabled: false },
                { label: '---' },
                { id: 'openSettings', label: 'Settings' },
                { id: 'openLogFolder', label: 'View Logs' },
                { id: 'openWebsite', label: 'Website' }
            ],

        });

        CEP.addEventListener('com.adobe.csxs.events.flyoutMenuClicked', (event) =>
        {
            if (event && event.data && event.data.menuId && event.data.menuName)
            {
                if (event.data.menuId === 'openWebsite')
                {
                    CEP.openURLInDefaultBrowser(WEBSITE);
                }
                else if (event.data.menuId === 'openLogFolder')
                {
                    CEP.evalScript('Folder(params.logFolderPath).execute()', { logFolderPath: Extension.get().folders.logs });
                }
                else if (event.data.menuId === 'openSettings')
                {
                    CEP.requestOpenExtension(RELEASE ? 'com.expresso.exporter.settings' : 'com.expresso.exporter.settings.debug');
                }
            }
        });

        // Support calling from ExtendScript, other extensions or keyboard shortcuts
        CEP.addEventListener('com.expresso.exporter.exportAll', () => { this.exportAll(); });
        CEP.addEventListener('com.expresso.exporter.exportEnabled', () => { this.exportEnabled(); });
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

});
