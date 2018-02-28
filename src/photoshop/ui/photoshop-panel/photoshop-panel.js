
import Ractive from 'ractive';
import CEP from 'core/CEP.js';
import Extension, { defaultLogger as logger } from 'core/Extension.js';
import SlowTask from 'core/SlowTask.js';
import './photoshop-panel.less';

export default Ractive.extend({

    // Append to document body by default
    el: document.body,
    append: true,

    template: require('./photoshop-panel.html'),

    data: {

        /**
         * Currently active document.
         * @type {Object}
         * @default null
         */
        activeDocument: null,

        /**
         * Connection error with Photoshop.
         * @type {String}
         * @default null
         */
        connectionError: null,

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
     * Called on component initialization.
     * @private
     */
    oninit: function ()
    {
        this.documents = [];

        if (RELEASE)
        {
            // Make the panel persistent in release mode
            CEP.makePersistent();

            // Prevent context menu
            CEP.setContextMenu('');
        }

        // Bind functions
        this.imageChanged = this.imageChanged.bind(this);
        this.connectionClosed = this.connectionClosed.bind(this);

        // Open the connection with Photoshop
        this.connectToPhotoshop();
    },

    /**
     * Called when component is destroyed.
     * @private
     */
    teardown: function ()
    {
        this._super();

        // Remove Photoshop handles
        Extension.get().photoshop.removePhotoshopEventListener('imageChanged', this.imageChanged);
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
     * Tries to connect to Photoshop.
     * @protected
     */
    connectToPhotoshop: function ()
    {
        // Hide any previous error
        this.set('connectionError', null);

        Promise.try(() =>
        {
            SlowTask.start('Connecting to Photoshop...');
            return Extension.get().photoshop.connect();

        }).then(() =>
        {
            // Setup Photoshop handles
            Extension.get().photoshop.onPhotoshopEvent('imageChanged', this.imageChanged);
            Extension.get().photoshop.once('close', this.connectionClosed)

            // And do a first sync to see if there is already an active document
            return CEP.evalScript('app.documents.length').then(num =>
            {
                num = parseInt(num, 10);

                if (num > 0)
                {
                    return Extension.get().photoshop.getDocumentInfo(null, {

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

        }).catch((err) =>
        {
            // Show error
            this.set('connectionError', err.toString());

        }).finally(() =>
        {
            SlowTask.complete();
        });
    },

    /**
     * Called when the connection with Photoshop is closed.
     * @protected
     */
    connectionClosed: function ()
    {
        // Close all the documents to prevent them from becoming stale
        this.set('activeDocument', null);

        for (let document of this.documents)
        {
            if (document)
            {
                document.fire('closed', document);
                document.teardown();
            }
        }
        this.documents = [];

        // Notify the user
        this.set('connectionError', 'Connection closed.');
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
            for (let document of this.documents)
            {
                if (document.get('documentId') === event.id)
                {
                    document.fire('imageChanged', event);
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
            SlowTask.start('Loading document...');

            // Switch active document
            // Start by hiding any other visible document
            const oldDocument = this.get('activeDocument');

            if (oldDocument)
            {
                oldDocument.set('visible', false);
            }

            // Search the cache for the document we need to show
            let newDocument = null;

            for (let document of this.documents)
            {
                if (document.get('documentId') === newDocumentId)
                {
                    newDocument = document;
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

                // Load document data
                return Promise.all([newDocument.fetchLayers(), newDocument.load()]).then(() => newDocument);
            }

            return newDocument;

        }).then((newDocument) =>
        {
            // Make the document visible
            this.set('activeDocument', newDocument);
            newDocument.set('visible', true);
            newDocument.fire('activated', newDocument);

            // Make Ractive render the document
            if (!newDocument.fragment.rendered)
            {
                newDocument.render('#documents');
            }

        }).catch(error =>
        {
            const msg = `Error synchronizing the document list with Photoshop. ${error.message}`;

            if (RELEASE)
            {
                CEP.alert(msg);
            }

            logger.error(msg);

        }).finally(() =>
        {
            SlowTask.complete();
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
            SlowTask.start(1, 'Cleaning up...');

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
                CEP.alert(msg);
            }

            logger.error(msg, error);

        }).finally(() =>
        {
            SlowTask.complete();
        });
    },

});
