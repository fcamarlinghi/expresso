
import CEP from 'core/CEP.js';
import Extension, { defaultLogger as logger } from 'core/Extension.js';
import CoreBase from 'core/ui/core-base/core-base.js';

function parseLayers(inlayers, outlayers, padding)
{
    for (let i = 0; i < inlayers.length; i++)
    {
        if (inlayers[i].type === 'layerSection')
        {
            outlayers.push({
                id: inlayers[i].id,
                index: inlayers[i].index,
                name: inlayers[i].name,
                __padding: padding,
            });

            if (inlayers[i].layers && inlayers[i].layers.length > 0)
            {
                parseLayers(inlayers[i].layers, outlayers, padding + 1);
            }
        }
    }
}

/**
 * Base class for Expresso documents, which wrap Photoshop documents
 * adding all the functionality we need.
 */
export default CoreBase.extend({

    append: true,

    data: function ()
    {
        return {

            /**
             * Id of the Photoshop document we represent.
             * @type Number
             * @default null
             */
            documentId: null,

            /**
             * Name of the valuekey to get from the document XMP metadata.
             * @type String
             * @default ''
             */
            key: '',

            /**
             * Whether this document should render its UI (typically true for active documents).
             * @type Boolean
             * @default false
             */
            visible: false,

            /**
             * Document layers.
             * @type Array
             * @default []
             */
            layers: [],

        };
    },

    /** Save timeout handler. */
    saveHandle: null,

    /** Rate limit at which data is saved to document. */
    saveHysteresis: 300,

    /** Whether document data has been loaded from XMP. */
    loaded: false,

    /** Rate limit at which layer updates are handled. */
    layersUpdateHysteresis: 300,

    /** Timeout handle for layers updates. */
    layersUpdateHandle: null,

    /**
     * Called on component initialization.
     * @private
     */
    oninit: function ()
    {
        this._super();

        // Bind functions
        this.modelUpdated = this.modelUpdated.bind(this);
        this.save = this.save.bind(this);
        this.fetchLayers = this.fetchLayers.bind(this);

        // Events
        this.on('imageChanged', this.imageChanged);
    },

    /**
     * Called when component is destroyed.
     * @private
     */
    teardown: function ()
    {
        this.off('imageChanged');
        this._super();
    },

    /**
     * Called every time data is updated.
     * @private
     */
    modelUpdated: function (newValue, oldValue, keyPath)
    {
        if (!this.loaded)
        {
            return;
        }

        if (this.saveHandle !== null)
        {
            clearTimeout(this.saveHandle);
            this.saveHandle = null;
        }

        this.saveHandle = setTimeout(this.save, this.saveHysteresis);
    },

    /**
     * Loads document data.
     * @private
     */
    load: function ()
    {
        const jsx = require('./host/getXMPMetadata.jsx');

        return Promise.try(() =>
        {
            // Do not listen to model changes while loading data
            // (since the loading operation itself will trigger an update)
            this.loaded = false;

            const params = {
                namespace: 'http://minifloppy.it/Expresso/1.0/',
                prefix: 'expresso',
                key: this.get('key'),
            };

            return CEP.evalScript(jsx, params);

        }).then(data =>
        {
            if (String.isEmpty(data))
            {
                logger.info('No XMP data found.');
            }
            else
            {
                logger.info('Loaded XMP:', data);
            }

            // Parse data (deserialize may return a promise)
            return this.deserialize(data);

        }).then(data =>
        {
            // Start listening to model changes
            this.loaded = true;
            this.fire('loaded', this);

        }).catch(error =>
        {
            const msg = `Error while loading document data. ${error.message}`;

            if (RELEASE)
            {
                CEP.alert(msg);
            }

            logger.error(msg);

        });
    },

    /**
     * Saves document data.
     * @private
     */
    save: function ()
    {
        const jsx = require('./host/setXMPMetadata.jsx');

        return Promise.try(() =>
        {
            if (this.saveHandle !== null)
            {
                clearTimeout(this.saveHandle);
                this.saveHandle = null;
            }

            const params = {
                namespace: 'http://minifloppy.it/Expresso/1.0/',
                prefix: 'expresso',
                key: this.get('key'),
                data: this.serialize(),
            };

            return CEP.evalScript(jsx, params).then(function () { return params.data; });

        }).then(data =>
        {
            logger.info('Saved XMP:', data);
            this.fire('saved', this);

        }).catch(error =>
        {
            const msg = `Error while saving document data. ${error.message}`;

            if (RELEASE)
            {
                CEP.alert(msg);
            }

            logger.error(msg);

        });
    },

    /** 
     * Serializes document data (called when document is being saved).
     * Should be overridden in derived classes.
     * @protected
     */
    serialize: function ()
    {
        return JSON.stringify({});
    },

    /** 
     * Deserializes document data (called when document data has been loaded).
     * Should be overridden in derived classes.
     * @protected
     */
    deserialize: function (data)
    {
        return JSON.parse(data);
    },

    /**
     * Called after document was modified in Photoshop.
     * @private
     */
    imageChanged: function (event)
    {
        // Layers
        if (event.layers && event.layers.length)
        {
            // Use a timeout to avoid too frequent updates
            if (this.layersUpdateHandle !== null)
            {
                clearTimeout(this.layersUpdateHandle);
            }

            this.layersUpdateHandle = setTimeout(this.fetchLayers, this.layersUpdateHysteresis);
        }
    },

    /**
     * Loads layers from the document.
     * @private
     */
    fetchLayers: function ()
    {
        // Reset any pending timeout
        if (this.layersUpdateHandle !== null)
        {
            clearTimeout(this.layersUpdateHandle);
            this.layersUpdateHandle = null;
        }

        // We're interested in all layer sets
        return Extension.get().photoshop.getDocumentInfo(this.get('documentId'), {

            compInfo: false,
            imageInfo: false,
            layerInfo: true,
            expandSmartObjects: false,
            getTextStyles: false,
            getFullTextStyles: false,
            selectedLayers: false,
            getCompLayerSettings: false,
            getDefaultLayerFX: false

        }).then(document =>
        {
            let layers = [{ id: -1, index: -1, name: 'None' }, { name: '---' }];
            parseLayers(document.layers, layers, 1);
            this.set('layers', layers, { compare: 'id', shuffle: true });
            return this.get('layers');
        });
    },

});
