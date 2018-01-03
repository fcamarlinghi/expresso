
import Ractive from 'ractive';
import application from '../../framework/Application.js';
import './core-panel.less';

export default Ractive.components['core-panel'] = Ractive.extend({

    // Append to document body by default
    el: document.body,
    append: true,

    template: require('./core-panel.html'),

    data: {

        /**
         * Currently active document.
         * @type Object
         * @default null
         */
        activeDocument: null,

    },

    computed: {

        /** Gets whether there is a document currently open. */
        hasActiveDocument: function () { return !!this.get('activeDocument'); },

    },

    /**
     * Currently open documents.
     * @type Array
     * @default null
     */
    documents: null,

    /**
     * Sets whether the panel is currently busy with a long operation
     * and a throbber animation, alongside an optional message,
     * should be shown to the user.
     * @public
     */
    setBusy: function (status, message)
    {
        const throbber = this.findComponent('core-throbber');
        if (throbber)
        {
            throbber.set('visible', !!status);
            throbber.set('message', (status && !String.isEmpty(message)) ? message : '');
        }
    },

    /**
     * Gets whether the panel is currently busy with a long operation.
     * @public
     */
    isBusy: function ()
    {
        const throbber = this.findComponent('core-throbber');
        return (throbber && throbber.get('visible'));
    },

    /**
     * Called on component initialization.
     * @private
     */
    oninit: function ()
    {
        this.documents = [];

        if (RELEASE)
        {
            // Make panel persistent in release mode
            application.cep.makePersistent();

            // Prevent context menu
            application.cep.setContextMenu('');
        }

        // Setup Photoshop handles
        this.imageChanged = this.imageChanged.bind(this);
        application.photoshop.onPhotoshopEvent('imageChanged', this.imageChanged);

        // And do a first sync to see if there is already an active document
        application.cep.evalScript('app.documents.length').then(num =>
        {
            num = parseInt(num, 10);

            if (num > 0)
            {
                return application.photoshop.getDocumentInfo(null, {

                    compInfo: false,
                    imageInfo: false,
                    layerInfo: false,
                    expandSmartObjects: false,
                    getTextStyles: false,
                    getFullTextStyles: false,
                    selectedLayers: false,
                    getCompLayerSettings: false,
                    getDefaultLayerFX: false

                }).then(document =>
                {
                    return this.activeDocumentChanged(document.id);

                });
            }
        });
    },

    /**
     * Called when component is destroyed.
     * @private
     */
    teardown: function ()
    {
        this._super();

        // Remove Photoshop handles
        application.photoshop.removePhotoshopEventListener('imageChanged', this.imageChanged);
    },

    /** 
     * Creates the Javascript representation of a Photoshop document.
     * @param {Number} documentId Photoshop document ID.
     * @protected
     */
    createDocumentModel: function (documentId)
    {
        throw new Error('createDocumentModel should be implemented in derived classes.');
    },

    /**
     * Called when a 'imageChanged' event is fired by Photoshop.
     * @protected
     */
    imageChanged: function (event)
    {
        if (event.closed === true)
        {
            this.documentClosed(event.id);
        }
        else if (event.active === true)
        {
            this.activeDocumentChanged(event.id);
        }
        else
        {
            // Notify document it was modified
            for (let i = 0; i < this.documents.length; i++)
            {
                if (this.documents[i].get('documentId') === event.id)
                {
                    this.documents[i].fire('imageChanged', event);
                    break;
                }
            }
        }
    },

    /**
     * Called when the currently active document has changed in Photoshop.
     * @protected
     */
    activeDocumentChanged: function (newDocumentId)
    {
        Promise.try(() =>
        {
            this.setBusy(true, 'Loading document...');

            // Switch active document
            // Start by hiding any other visible document
            const oldDocument = this.get('activeDocument');

            if (oldDocument)
            {
                oldDocument.set('visible', false);
            }

            // Search the cache for the document we need to show
            let newDocument = null;

            for (let i = 0; i < this.documents.length; i++)
            {
                if (this.documents[i].get('documentId') === newDocumentId)
                {
                    newDocument = this.documents[i];
                    break;
                }
            }

            if (newDocument === null)
            {
                // No cached representation of the current document was
                // found, create a new one and cache it now
                newDocument = this.createDocumentModel(newDocumentId);
                this.documents.push(newDocument);
                newDocument.fire('opened', newDocument);
            }

            // Make the document visible
            this.set('activeDocument', newDocument);
            newDocument.set('visible', true);
            newDocument.fire('activated', newDocument);

            // Hack: force Ractive to render the document directly inside the DOM
            if (!newDocument.fragment.rendered)
            {
                const div = window.document.createElement('div');
                this.find('#documents').appendChild(div);
                newDocument.render(div);
            }

        }).catch(error =>
        {
            const msg = `Error synchronizing the document list with Photoshop. ${error.message}`;

            if (RELEASE)
            {
                application.cep.alert(msg);
            }

            application.logger.error(msg);

        }).finally(() =>
        {
            this.setBusy(false);
        });
    },

    /**
     * Called when the specified document was closed in Photoshop.
     * @protected
     */
    documentClosed: function (closedDocumentId)
    {
        Promise.try(() =>
        {
            this.setBusy(true, 'Cleaning up...');

            // Handle case where we closed the currently active document
            const activeDocument = this.get('activeDocument');

            if (activeDocument && activeDocument.get('documentId') === closedDocumentId)
            {
                this.set('activeDocument', null);
            }

            // Delete UI for the document that has been closed
            for (let i = 0; i < this.documents.length; i++)
            {
                const document = this.documents[i];

                if (document.get('documentId') === closedDocumentId)
                {
                    document.fire('closed', document);
                    document.teardown();
                    this.documents.splice(i, 1);
                    break;
                }
            }

        }).catch(error =>
        {
            const msg = `Error synchronizing the document list with Photoshop. ${error.message}`;

            if (RELEASE)
            {
                application.cep.alert(msg);
            }

            application.logger.error(msg, error);

        }).finally(() =>
        {
            this.setBusy(false);
        });
    },

});
