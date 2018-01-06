// Original code:
/*
 * Copyright (c) 2013 Adobe Systems Incorporated. All rights reserved.
 *  
 * Permission is hereby granted, free of charge, to any person obtaining a
 * copy of this software and associated documentation files (the "Software"), 
 * to deal in the Software without restriction, including without limitation 
 * the rights to use, copy, modify, merge, publish, distribute, sublicense, 
 * and/or sell copies of the Software, and to permit persons to whom the 
 * Software is furnished to do so, subject to the following conditions:
 *  
 * The above copyright notice and this permission notice shall be included in
 * all copies or substantial portions of the Software.
 *  
 * THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
 * IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY, 
 * FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
 * AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER 
 * LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING 
 * FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER 
 * DEALINGS IN THE SOFTWARE.
 * 
 */

import { EventEmitter } from 'events';
import extend from 'extend';

import CEP from 'core/CEP.js';
import Logger from 'core/Logger.js';

import Deferred from './Deferred.js';
import PhotoshopClient from './PhotoshopClient.js';
import Pixmap from './Pixmap.js';

// Some commands result in multiple response messages. After the first response message is 
// received, if there's a gap longer than this in responses, we assume there was an error.
const MULTI_MESSAGE_TIMEOUT = 5000;

const PHOTOSHOP_EVENT_PREFIX = 'PHOTOSHOP-EVENT-';

/**
 * Interpolation types.
 * @const
 * @see Photoshop.prototype.getPixmap
 * @type {string}
 */
export const PhotoshopInterpolation = Object.create(null, {

    'NEAREST_NEIGHBOR': { value: 'nearestNeighbor', enumerable: true },
    'BILINEAR': { value: 'bilinear', enumerable: true },
    'BICUBIC': { value: 'bicubic', enumerable: true },
    'BICUBIC_SMOOTHER': { value: 'bicubicSmoother', enumerable: true },
    'BICUBIC_SHARPER': { value: 'bicubicSharper', enumerable: true },
    'BICUBIC_AUTOMATIC': { value: 'bicubicAutomatic', enumerable: true },
    'PRESERVE_DETAILS_UPSCALE': { value: 'preserveDetailsUpscale', enumerable: true },
    'AUTOMATIC': { value: 'automaticInterpolation', enumerable: true }

});

/** Logger. */
const logger = new Logger('Photoshop');

/**
 * Photoshop interface.
 */
export default class PhotoshopInterface extends EventEmitter
{

    constructor()
    {
        super();

        Object.defineProperties(this, {

            client: { value: null, writable: true, enumerable: true },

            paths: {

                value: {
                    folder: null,
                    executable: null,
                    convert: null,
                    pngquant: null,
                },

                enumerable: true,
            },

            // Private
            _messageSockets: { value: {} },

            _eventSubscriptions: { value: {} },

        });
    }

    /** 
     * Connects to photoshop.
     * @param {Object} options Connection options.
     * @return {Promise} A promise.
     */
    connect(options)
    {
        logger.debug('Connecting to Photoshop...');

        return new Promise((resolve, reject) =>
        {
            // Connect to photoshop
            this.client = new PhotoshopClient(options);

            this.client.once('connect', () =>
            {
                logger.info('Connection opened.');
                resolve();
            });

            this.client.on('close', () =>
            {
                logger.info('Connection closed.');
                this.emit('close');
            });

            this.client.on('error', err =>
            {
                // If the error does refer to a specific command we ran, reject the
                // corresponding deferred and let it handle the error
                if (err && this._messageSockets.hasOwnProperty(err.id))
                {
                    this._messageSockets[err.id].reject(err.body);
                }
                else
                {
                    logger.warn('Photoshop error', err);
                    reject(err);
                }

            });

            this.client.on('communicationsError', (err, raw) =>
            {
                logger.warn('Communication error:', { error: err, rawMessage: raw });
            });

            this.client.on('message', (id, parsed, raw) =>
            {
                if (this._messageSockets[id])
                {
                    this._messageSockets[id].notify({ type: 'javascript', value: parsed });
                }
            });

            this.client.on('info', info =>
            {
                logger.info('Received info:', info);
            });

            this.client.on('event', (id, eventName, parsed, raw) =>
            {
                const prefixedEventName = PHOTOSHOP_EVENT_PREFIX + eventName;
                return this.emit(prefixedEventName, parsed);
            });

            this.client.on('pixmap', (id, messageBody, raw) =>
            {
                if (this._messageSockets[id])
                {
                    this._messageSockets[id].notify({ type: 'pixmap', value: messageBody });
                }
            });

            this.client.on('iccProfile', (id, messageBody, raw) =>
            {
                if (this._messageSockets[id])
                {
                    this._messageSockets[id].notify({ type: 'iccProfile', value: messageBody });
                }
            });

        }).then(() =>
        {
            // Get program info
            const getPhotoshopExecutableLocation = require('./host/getPhotoshopExecutableLocation.jsx');

            const sequence = [
                CEP.evalScript('File(app.path).fsName').then(path =>
                {
                    this.paths.folder = path;

                }).catch(() =>
                {
                    logger.warning('Couldn\'t get Photoshop folder path.')
                }),

                CEP.evalScript(getPhotoshopExecutableLocation).then(path =>
                {
                    this.paths.executable = path;

                }).catch(() =>
                {
                    logger.warning('Couldn\'t get Photoshop executable path.')
                })
            ];

            return Promise.all(sequence);

        }).then(() =>
        {
            // Get util paths (done separately because they need the program path)
            const fs = require('fs'),
                resolve = require('path').resolve,
                stat = Promise.promisify(fs.stat);

            // Convert
            let convertPath = resolve(this.paths.executable, (process.platform === 'darwin') ? 'convert' : 'convert.exe');

            let convertPromise = stat(convertPath).then(() =>
            {
                this.paths.convert = convertPath;

            }).catch(err =>
            {
                logger.warning(`Convert binary could not be found at "${convertPath}". Convert functionality will not be available.`);
            });

            // PNGQuant
            let pngquantPath = resolve(this.paths.executable, (process.platform === 'darwin') ? 'pngquant' : 'pngquant.exe');

            let pngquantPromise = stat(pngquantPath).then(() =>
            {
                this.paths.pngquant = pngquantPath;

            }).catch(err =>
            {
                logger.warning(`PNGQuant binary could not be found at "${pngquantPath}". PNGQuant functionality will not be available.`);
            });

            return Promise.all([convertPromise, pngquantPromise]);

        }).then(() =>
        {
            logger.info('Client ready.');

        });
    }

    /** 
     * Disconnects from photoshop.
     */
    disconnect()
    {
        if (this.client)
        {
            try
            {
                this.client.disconnect();
            }
            catch (e)
            {
                // do nothing
            }

            this.client = null;
        }
    }

    /** 
     * Gets whether we're currently connected to photoshop.
     * @return {Boolean}
     */
    isConnected()
    {
        return (this.client && this.client.isConnected());
    }

    /** 
     * Sends a 'keep alive' message to photoshop.
     * @return {Promise} A promise.
     */
    checkConnection()
    {
        let deferred = new Deferred(),
            id = this.client.sendKeepAlive();

        this._messageSockets[id] = deferred;

        deferred.progressed((message) =>
        {
            if (message.type === 'javascript')
            {
                deferred.resolve(message.value);
            }

        }).finally(() =>
        {
            delete this._messageSockets[id];
        });

        return deferred.promise;
    }

    /** 
     * Internal implementation, @see evalScript.
     * Check Generator source code for additional info.
     * @private
     */
    _sendScript(script, params, deferred)
    {
        let paramsString;

        if (typeof params === 'object')
        {
            paramsString = 'var params = ' + JSON.stringify(params) + ';';
        }
        else
        {
            paramsString = 'var params = null;';
        }

        const jsx = paramsString + script;

        logger.debug('_sendScript:', jsx);

        const id = this.client.sendCommand(jsx);
        deferred = deferred || new Deferred();
        this._messageSockets[id] = deferred;

        deferred.promise.finally(() =>
        {
            delete this._messageSockets[id];
        });

        return deferred;
    }

    /** 
     * Evaluates the specified Extendscript string.
     * @param {String} script JSX script.
     * @param {?Object} params Parameters passed to the script.
     * @return {Promise.<any>} A promise.
     */
    evalScript(script, params)
    {
        const deferred = this._sendScript(script, params);

        deferred.progressed((message) =>
        {
            if (message.type === 'javascript')
            {
                deferred.resolve(message.value);
            }
        });

        return deferred.promise;
    }

    /** 
     * Calls the specified Generator script.
     * @param {String} menu Generator menu name.
     * @param {Object} [data={}] Data passed to the generator script.
     * @return {Promise} A promise.
     */
    generator(menu, data)
    {
        const jsx = require('./host/callGenerator.jsx');
        return CEP.evalScript(jsx, { menu: menu, data: data });
    }

    /** 
     * Gets a TypeID out of the specified CharID.
     * @param {String} charId CharID.
     * @return {Promise} A promise that resolves to the TypeID.
     */
    charIDToTypeID(charId)
    {
        return new Promise((resolve, reject) =>
        {
            let script;

            if (charId.length > 4)
            {
                script = 'stringIDToTypeID(' + JSON.stringify(charId) + ')';
            }
            else
            {
                script = 'charIDToTypeID(' + JSON.stringify(charId) + ')';
            }

            CEP.evalScript(script).then((typeId) =>
            {
                typeId = +typeId;

                if (!isNaN(typeId) && typeId > 0 && isFinite(typeId))
                {
                    resolve(typeId);
                }
                else
                {
                    reject(new TypeError('Invalid TypeID received: ' + typeId));
                }

            }, reject);

        });
    }

    /**
     * Copies the specified string to system's clipboard.
     * @return {Promise} A promise.
     */
    copyToClipboard(str)
    {
        const jsx = require('./host/copyToClipboard.jsx');
        return CEP.evalScript(jsx, { clipboard: str });
    }

    /**
     * Gets the path of a document.
     * @param {Number} [documentId] Document ID. To find out the path of the current document, leave this empty.
     * @return {Promise.<String,Null>} A promise that resolves to the document path
     * if the document is saved; otherwise, to null.
     */
    getDocumentPath(documentId)
    {
        const jsx = require('./host/getDocumentPath.jsx');
        return CEP.evalScript(jsx, { documentId: documentId }).then((documentPath) =>
        {
            if (String.isEmpty(documentPath))
            {
                return null;
            }
            else
            {
                return documentPath;
            }
        });
    }

    /**
     * Gets an array of all open document IDs.
     * @return {Promise.<Array>} A promise.
     */
    getOpenDocumentIDs()
    {
        const jsx = require('./host/getOpenDocumentIDs.jsx');

        return CEP.evalScript(jsx).then(ids =>
        {
            if (typeof ids === 'number')
            {
                return [ids];
            }
            else if (typeof ids === 'string' && ids.length > 0)
            {
                return ids.split(':').map(id => parseInt(id, 10));
            }
            else
            {
                return [];
            }
        });
    }

    /**
     * Gets information about a document.
     * 
     * @param {Number} [documentId] Document ID. To find out about the current document, leave this empty.
     * @param {Object.<String, Boolean>} [flags] Optional override of default flags for
     * document info request. The optional flags and their default values are:
     *
     *  - compInfo: [true]
     *
     *  - imageInfo: [true]
     *
     *  - layerInfo: [true]
     *    Specifies which info to send (image-specific, layer-specific, comp-specific)
     *    If none of these is specified, all three default to true, otherwise it just
     *    returns the true values.
     *
     *  - expandSmartObjects: [false]
     *    Recurse into smart object (placed) documents.
     *
     *  - getTextStyles: [true]
     *    Get limited text/style info for text layers. Returned in the 'text' property of
     *    layer info.
     *
     *  - getFullTextStyles: [false]
     *    Get all text/style info for text layers. Returned in the 'text' property of 
     *    layer info, can be rather verbose.
     *
     *  - selectedLayers: [false]
     *    If true, only return details on the layers that the user has selected. If false,
     *    all layers are returned.
     *
     *  - getCompLayerSettings: [true]
     *    If true, send actual layer settings in comps (not just the comp ids, useVisibility,
     *    usePosition, and useAppearance).
     *
     *  - getDefaultLayerFX: [false]
     *    If true, send all fx settings for enabled fx, even if they match the defaults. If false
     *    layer fx settings will only be sent if they are different from default settings.
     *
     *  - getPathData: [false]
     *    If true, shape layers will include detailed path data (in the same format as 
     *    generator.getLayerShape).
     */
    getDocumentInfo(documentId, flags)
    {
        const params = {
            documentId: documentId,
            flags: {
                compInfo: true,
                imageInfo: true,
                layerInfo: true,
                expandSmartObjects: false,
                getTextStyles: true,
                getFullTextStyles: false,
                selectedLayers: false,
                getCompLayerSettings: true,
                getDefaultLayerFX: false,
                getPathData: false
            }
        };

        if (flags)
        {
            const hasOwnProperty = Object.prototype.hasOwnProperty;
            Object.keys(params.flags).forEach((key) =>
            {
                if (hasOwnProperty.call(flags, key))
                {
                    params.flags[key] = !!flags[key];
                }
            });
        }

        const jsx = require('./host/getDocumentInfo.jsx');
        return this.evalScript(jsx, params);
    }

    //
    // Events
    //
    // Photoshop events (e.g. 'imageChanged') are managed a little differently than
    // lifecycle events (e.g. connect, close, error) for two reasons. First, when a user
    // registers for a Photoshop event, we need to actually subscribe to that event over
    // the Photoshop connection and, if that subscription fails, we want to clean up
    // properly. Second, we want to avoid name conflicts with lifecycle events. (E.g.
    // Photoshop could add an 'error' event.) To do this, we have our own registration
    // and removal functions that mimic the regular EventEmitter interface. Event names
    // are prefixed with a constant string, and actual events are dispatched through
    // the usual 'emit' codepath.

    /** 
     * Registers to the specified photoshop events.
     * @param {String[]} events NetworkEventID or a CharID, StringID of the Photoshop event to register to.
     * @return A promise that resolves once we are done registering to the event.
     */
    subscribeToPhotoshopEvents(events)
    {
        if (!Array.isArray(events))
        {
            events = [events];
        }

        // Prevent redundant event subscriptions
        for (let i = events.length - 1; i >= 0; i--)
        {
            const e = events[i];

            // If we are already subscribed to this event
            if (this._eventSubscriptions[e])
            {
                // Remove this event from the list
                events.splice(i, 1);
            }
            else
            {
                // Otherwise remember the subscription
                this._eventSubscriptions[e] = true;
            }
        }

        if (events.length > 0)
        {
            const params = { events: events },
                jsx = require('./host/networkEventSubscribe.jsx');

            return this.evalScript(jsx, params);
        }
        else
        {
            return Promise.resolve();
        }
    }

    // Helper function
    _registerPhotoshopEventHelper(event, listener, isOnce)
    {
        const registerFunction = isOnce ? this.once : this.on;

        this.subscribeToPhotoshopEvents(event).catch((error) =>
        {
            logger.error('Failed to subscribe to the', event, 'photoshop event:', error);
            this.removePhotoshopEventListener(event, listener);
        });

        return registerFunction.call(this, PHOTOSHOP_EVENT_PREFIX + event, listener);
    }

    /** 
     * Attaches a listener to the specified photoshop event.
     * @param {String} event NetworkEventID or a CharID, StringID of the Photoshop event to register to.
     * @param {Function} listener Callback function.
     * @return A promise that resolves once we are done registering to the event.
     */
    onPhotoshopEvent(event, listener)
    {
        return this._registerPhotoshopEventHelper(event, listener, false);
    }

    /** 
     * Attaches a one-time listener to the specified photoshop event.
     * @param {String} event NetworkEventID or a CharID, StringID of the Photoshop event to register to.
     * @param {Function} listener Callback function.
     * @return A promise that resolves once we are done registering to the event.
     */
    oncePhotoshopEvent(event, listener)
    {
        return this._registerPhotoshopEventHelper(event, listener, true);
    }

    /** 
     * Unregisters the specified listener from the Photoshop event.
     * @param {String} event NetworkEventID or a CharID, StringID of the Photoshop event to register to.
     * @param {Function} listener Callback function.
     * @return A promise that resolves once we are done unregistering from the event.
     */
    removePhotoshopEventListener(event, listener)
    {
        // TODO: We could unsubscribe from the PS event if we have no listeners left
        return this.removeListener(PHOTOSHOP_EVENT_PREFIX + event, listener);
    }

    /** 
     * Gets a list of listeners for the specified photoshop event.
     * @param {String} event NetworkEventID or a CharID, StringID of the Photoshop event to register to.
     */
    photoshopEventListeners(event)
    {
        return this.listeners(PHOTOSHOP_EVENT_PREFIX + event);
    }


    //
    // Pixmaps
    //

    /**
     * Gets a pixmap representing the pixels of a layer, or just the bounds of that pixmap.
     * The pixmap can be scaled either by providing a horizontal and vertical scaling factor (scaleX/scaleY)
     * or by providing a mapping between an input rectangle and an output rectangle. The input rectangle
     * is specified in document coordinates and should encompass the whole layer.
     * The output rectangle should be of the target size.
     * 
     * @param {!number} documentId Document ID.
     * @param {!number|{firstLayerIndex: number, lastLayerIndex: number, hidden: Array.<number>=}} layerSpec
     * Either the layer ID of the desired layer as a number, or an object of the form {firstLayerIndex: number,
     * lastLayerIndex: number, ?hidden: Array.<number>} specifying the desired index range, inclusive, and
     * (optionally) an array of indices to hide. Note that the number form takes a layer ID, *not* a layer index.
     * @param {!Object} settings An object with params to request the pixmap.
     * @param {?boolean} settings.boundsOnly Whether to return an object with bounds rather than the pixmap. The returned
     * object will have the format (but with different numbers): { bounds: {top: 0, left: 0, bottom: 100, right: 100 } }.
     * @param {?Object} settings.inputRect  Rectangular part of the document to use (usually the layer's bounds).
     * @param {?Object} settings.outputRect Rectangle into which the the layer should fit.
     * @param {?float} settings.scaleX The factor by which to scale the image horizontally (1.0 for 100%).
     * @param {?float} settings.scaleX The factor by which to scale the image vertically (1.0 for 100%).
     * @param {!float} settings.inputRect.left Pixel distance of the rect's left side from the doc's left side.
     * @param {!float} settings.inputRect.top Pixel distance of the rect's top from the doc's top.
     * @param {!float} settings.inputRect.right Pixel distance of the rect's right side from the doc's left side.
     * @param {!float} settings.inputRect.bottom Pixel distance of the rect's bottom from the doc's top.
     * @param {!float} settings.outputRect.left Pixel distance of the rect's left side from the doc's left side.
     * @param {!float} settings.outputRect.top Pixel distance of the rect's top from the doc's top.
     * @param {!float} settings.outputRect.right Pixel distance of the rect's right side from the doc's left side.
     * @param {!float} settings.outputRect.bottom Pixel distance of the rect's bottom from the doc's top.
     * @param {?boolean} settings.useSmartScaling Use Photoshop's 'smart' scaling to scale layer, which.
     * (confusingly) means that stroke effects (e.g. rounded rect corners) are *not* scaled. (Default: false).
     * @param {?boolean} settings.includeAncestorMasks Cause exported layer to be clipped by any ancestor masks
     * that are visible (Default: false).
     * @param {?boolean} settings.convertToWorkingRGBProfile: If true, performs a color conversion on the pixels
     * before they are sent to generator. The color is converted to the working RGB profile (specified for
     * the document in PS). By default (when this setting is false), the 'raw' RGB data is sent, which is
     * what is usually desired. (Default: false).
     * @param {?string} settings.useICCProfile: String with the ICC color profile to use. If set this overrides
     * the convertToWorkingRGBProfile flag. A common value is 'sRGB IEC61966-2.1'. (Default: '')
     * @param {?boolean} settings.getICCProfileData: If true then the final ICC profile for the image is included 
     * along with the returned pixamp (added after PS 16.1)
     * @param {?boolean} settings.allowDither controls whether any dithering could possibly happen in the color
     * conversion to 8-bit RGB. If false, then dithering will definitely not occur, regardless of either
     * the value of useColorSettingsDither and the color settings in Photoshop. (Default: false).
     * @param {?boolean} settings.useColorSettingsDither If settings.allowDither is true, then this controls
     * whether to (if true) Deferred to the user's color settings in PS, or (if false) to force dither in any
     * case where a conversion to 8-bit RGB would otherwise be lossy. If allowDither is false, then the
     * value of this parameter is ignored. (Default: false).
     * @param {string=} settings.interpolationType Force pixmap scaling to use the given interpolation method.
     * If defined, the value should be one of the PhotoshopInterpolation constants. Otherwise,
     * Photoshop's default interpolation type (as specified in Preferences > Image Interpolation) is used (Default: undefined).
     * @param {?boolean} settings.forceSmartPSDPixelScaling: If true, forces PSD Smart objects to be scaled
     * completely in pixel space (as opposed to scaling vectors, text, etc. in a smoother fashion.) In
     * PS 15.0 and earlier pixel space scaling was the only option. So, setting this to 'true' will replicate
     * older behavior (Default: false).
     * @param {?boolean} settings.clipToDocumentBounds: If true, crops returned pixels to the document bounds.
     * By default, all pixels for the specified layers are returned, even if they lie outside the document
     * bounds (e.g. if the document was cropped without 'Delete Cropped Pixels' checked).
     * Note that this option *cannot* be used with an inputRect/outputRect scaling. If inputRect/outputRect
     * is set, this setting will be ignored and the pixels will not be cropped to document bounds (Default: false).
     * @param {number=} settings.maxDimension: This is the maximal dimension of pixmap that can be returned
     * by Photoshop (same for both axis). Raise this value if you need to work with bigger images (Default: 10000).
     * @param {number=} settings.compId Layer comp ID (exclusive of settings.compIndex).
     * @param {number=} settings.compIndex Layer comp index (exclusive of settings.compId).
     * @return {Promise.<Pixmap>} Resolves with a pixmap.
     */
    getPixmap(documentId, layerSpec, settings)
    {
        const jsx = require('./host/getLayerPixmap.jsx');

        let executionDeferred = null,
            jsDeferred = new Deferred(),
            pixmapDeferred = new Deferred(),
            profileDeferred = new Deferred(),
            params = extend({
                documentId: documentId,
                layerSpec: layerSpec,
                compId: undefined,
                compIndex: undefined,
                inputRect: undefined,
                outputRect: undefined,
                scaleX: 1,
                scaleY: 1,
                bounds: false,
                boundsOnly: false,
                useSmartScaling: false,
                includeAncestorMasks: false,
                includeAdjustors: true,
                convertToWorkingRGBProfile: false,
                useICCProfile: undefined,
                getICCProfileData: false,
                allowDither: false,
                useColorSettingsDither: false,
                interpolationType: undefined,
                forceSmartPSDPixelScaling: false,
                clipToDocumentBounds: false,
                maxDimension: 10000,
            }, settings || {});

        // Validate some settings
        params.scaleX = params.scaleX || 1;
        params.scaleY = params.scaleY || 1;
        params.maxDimension = params.maxDimension || 10000;

        // Because of PS communication irregularities in different versions of PS, it's very complicated to
        // know when we're "done" getting responses from executing this JSX file. In various scenarios, the
        // evaluation of the JSX file produces some subset of the following responses in some *arbitrary* order:
        //
        // - A javascript message that is a stringification of an Action Descriptor object
        //  (i.e. "[ActionDescriptor]") -- this should always come back
        // - A javascript message that is a stringification of a JSON object that contains bounds -- currently
        //   this always comes back because "bounds" is hardcoded to "true" in the params list
        // - A pixmap message -- this should come back if and only if boundsOnly is false.
        //
        // The two deferreds at the top of this function (jsDeferred and pixmapDeferred) resolve when we've
        // received all of the expected messages of the respective type with the expected content. 
        executionDeferred = this._sendScript(jsx, params);

        executionDeferred.progressed((message) =>
        {
            if (message.type === 'javascript')
            {
                // We expect two javascript responses: one from the JSX evaluation result, and one containing bounds information
                if (!params.bounds || (message.value instanceof Object && message.value.hasOwnProperty('bounds')))
                {
                    jsDeferred.resolve(message.value);
                }
            }
            else if (message.type === 'pixmap')
            {
                pixmapDeferred.resolve(message.value);
            }
            else if (message.type === 'iccProfile')
            {
                profileDeferred.resolve(message.value);
            }
            else
            {
                logger.warn('Unexpected response from Photoshop:', message);
                executionDeferred.reject('Unexpected response from Photoshop');
            }
        });

        executionDeferred.promise.catch((err) =>
        {
            jsDeferred.reject(err);
            pixmapDeferred.reject(err);
            profileDeferred.reject(err);
        });

        // Resolve the pixmapDeferred and profileDeferred now if we aren't actually expecting a pixmap
        if (params.boundsOnly)
        {
            pixmapDeferred.resolve();
            profileDeferred.resolve();
        }

        // Resolve the profileDeferred if we aren't expecting it to come back
        if (!params.getICCProfileData)
        {
            profileDeferred.resolve();
        }

        return Promise.all([jsDeferred.promise, profileDeferred.promise, pixmapDeferred.promise]).spread((js, iccProfileBuffer, pixmapBuffer) =>
        {
            executionDeferred.resolve();

            if (params.boundsOnly && js && js.bounds)
            {
                return js;
            }
            else if ((!params.bounds || (js && js.bounds)) && pixmapBuffer)
            {
                let pixmap = new Pixmap(pixmapBuffer);
                pixmap.bounds = js.bounds;

                if (iccProfileBuffer)
                {
                    pixmap.iccProfile = iccProfileBuffer;
                }

                return pixmap;
            }
            else
            {
                const msg = 'Unexpected response from PS in getLayerPixmap: jsDeferred val: ' +
                    JSON.stringify(js) +
                    ', iccProfileBuffer was expected: ' + params.getICCProfileData + ', val: ' +
                    (iccProfileBuffer ? 'truthy' : 'falsy') +
                    ', pixmapDeferred val: ' +
                    (pixmapBuffer ? 'truthy' : 'falsy');
                throw new Error(msg);
            }

        }, err => executionDeferred.reject(err));
    }

    /**
     * Gets a pixmap representing the pixels of a document in the same layer visibility state
     * that is currently presented in Photoshop. Optionally pass settings with the same available
     * params as @see getPixmap method.
     *
     * @param {!number} documentId Document ID.
     * @param {Object=} settings getPixmap settings.
     * @return {Promise.<Pixmap>} Resolves with a pixmap representing the complete document.
     */
    getDocumentPixmap(documentId, settings)
    {
        if (documentId === undefined)
        {
            return Promise.reject('Document ID is required');
        }
        else
        {
            return this.getDocumentInfo(documentId, {
                compInfo: false,
                imageInfo: false,
                layerInfo: true,
                expandSmartObjects: false,
                getTextStyles: false,
                getFullTextStyles: false,
                selectedLayers: false,
                getCompLayerSettings: true,
                getDefaultLayerFX: false
            }).then((document) =>
            {
                const layerSpec = {
                    firstLayerIndex: 0,
                    lastLayerIndex: document.layers[0].index,
                    hidden: this._computeHiddenLayers(document),
                };

                return this.getPixmap(documentId, layerSpec, settings || {});

            });
        }
    }

    /**
     * Recursively walks layers of document and returns hidden ones.
     *
     * @private
     *
     * @param {!Object} parent Whole document or layer of type layerSection
     * @param {boolean=} hideAll If true, all children will be hidden, ignoring their own visibility
     *
     * @return {Array.<number>} Indices of hidden layers
     */
    _computeHiddenLayers(parent, hideAll)
    {
        return parent.layers.reduce((hiddenLayers, layer) =>
        {
            const isHidden = hideAll || !layer.visible;

            if (isHidden)
            {
                hiddenLayers.push(layer.index);
            }

            if (layer.type === 'layerSection' && layer.layers && layer.layers.length)
            {
                hiddenLayers = hiddenLayers.concat(this._computeHiddenLayers(layer, isHidden));
            }

            return hiddenLayers;

        }, []);
    }

    /**
     * Returns a promise that resolves to an object detailing the path
     * present on the specified layer. If there is no path present,
     * the promise rejects.
     */
    getLayerShape(documentId, layerId)
    {
        const jsx = require('./host/getLayerShape.jsx');

        let timeoutTimer = null,
            resultDeferred = new Deferred(),
            executionDeferred = this._sendScript(jsx, { documentId: documentId, layerId: layerId });

        resultDeferred.promise.finally(() =>
        {
            executionDeferred.resolve(); // done listening for messages

            if (timeoutTimer !== null)
            {
                clearTimeout(timeoutTimer);
            }
        });

        executionDeferred.progressed((message) =>
        {
            if (timeoutTimer === null)
            {
                // First message we've received
                timeoutTimer = setTimeout(() =>
                {
                    logger.warn('getLayerShape request timed out');
                    executionDeferred.resolve(); // done listening for messages
                    resultDeferred.reject('timeout');
                }, MULTI_MESSAGE_TIMEOUT);
            }

            if (message.type === 'javascript')
            {
                if (message.value instanceof Object && message.value.hasOwnProperty('path'))
                {
                    resultDeferred.resolve(message.value);
                }
                else if (message.value === '')
                {
                    // sendLayerShapeToNetworkClient returns a JSON object that is an
                    // empty string if there is no shape data on the layer;
                    resultDeferred.reject('layer does not contain a shape');
                }
            }
        });

        executionDeferred.promise.catch((err) =>
        {
            resultDeferred.reject(err);
        });

        return resultDeferred.promise;
    }

    _isBoundEmpty(bounds)
    {
        const height = bounds.bottom - bounds.top,
            width = bounds.right - bounds.left;

        return !(Number.isFinite(height) && Number.isFinite(width) && width > 0 && height > 0);
    }

    _unionBounds(boundsA, boundsB)
    {
        return {
            top: Math.min(boundsA.top, boundsB.top),
            left: Math.min(boundsA.left, boundsB.left),
            bottom: Math.max(boundsA.bottom, boundsB.bottom),
            right: Math.max(boundsA.right, boundsB.right)
        };
    }

    _intersectBounds(boundsA, boundsB)
    {
        let intersect = {
            top: Math.max(boundsA.top, boundsB.top),
            left: Math.max(boundsA.left, boundsB.left),
            bottom: Math.min(boundsA.bottom, boundsB.bottom),
            right: Math.min(boundsA.right, boundsB.right)
        };

        if (this._isBoundEmpty(intersect))
        {
            intersect = { top: 0, left: 0, bottom: 0, right: 0 };
        }

        return intersect;
    }

    _getTotalMaskBounds(bounds)
    {
        let maskBounds = bounds.mask && bounds.mask.enabled && bounds.mask.bounds,
            vectorMaskBounds = bounds.type !== 'shapeLayer' && bounds.path && bounds.path.bounds;

        if (maskBounds && this._isBoundEmpty(maskBounds))
        {
            maskBounds = undefined;
        }

        if (vectorMaskBounds && this._isBoundEmpty(vectorMaskBounds))
        {
            vectorMaskBounds = undefined;
        }

        if (maskBounds && vectorMaskBounds)
        {
            return this._unionBounds(maskBounds, vectorMaskBounds);
        }

        return maskBounds || vectorMaskBounds;
    }

    getDeepBounds(layer)
    {
        let bounds;

        if (!layer.layers)
        {
            bounds = layer.bounds;
        }
        else
        {
            layer.layers.forEach(function (sub)
            {
                let childBounds = this.getDeepBounds(sub);

                if (childBounds)
                {
                    if (!bounds)
                    {
                        bounds = childBounds;
                    }
                    else
                    {
                        // Compute containing rect of union of bounds and childBounds
                        bounds = this._unionBounds(bounds, childBounds);
                    }
                }
            }, this);
        }

        let maskBounds = this._getTotalMaskBounds(layer);

        if (maskBounds)
        {
            // compute containing rect of intersection of bounds and maskBounds
            bounds = this._intersectBounds(bounds, maskBounds);
        }

        return bounds;
    }

    /**
     * Computes the settings for getPixmap to achieve a certain scaling/padding result.
     *
     * staticInputBounds is essentially document.layers[i].bounds.
     * visibleInputBounds is essentially document.layers[i].boundsWithFX or pixmap.bounds (better).
     * paddedInputBounds is visibleInputBounds extended by document.layers[i].mask.bounds.
     * paddedInputBounds can therefore extend beyond document.layers[i].mask.bounds (due to effects).
     *
     * For a usage example, see the Image Assets plugin (https://github.com/adobe-photoshop/generator-assets).
     *
     * @param {!Object} settings How to scale the pixmap (including padding)
     * @param {?float}  settings.width  Requested width of the image
     * @param {?float}  settings.height Requested height of the image
     * @param {?float}  settings.scaleX Requested horizontal scaling of the image
     * @param {?float}  settings.scaleY Requested vertical scaling of the image
     * @param {!Object<String,float>} staticInputBounds  Bounds for the user-provided content (pixels, shapes)
     * @param {!Object<String,float>} visibleInputBounds Bounds for the visible content (user-provided + effects)
     * @param {!Object<String,float>} paddedInputBounds  Bounds for the whole image (visible + padding)
     */
    getPixmapParams(settings, staticInputBounds, visibleInputBounds, paddedInputBounds, clipToBounds)
    {
        // For backwards compatibility
        paddedInputBounds = paddedInputBounds || visibleInputBounds;
        clipToBounds = clipToBounds || paddedInputBounds;

        let // Scaling settings
            targetWidth = settings.width,
            targetHeight = settings.height,
            targetScaleX = settings.scaleX || settings.scale || 1,
            targetScaleY = settings.scaleY || settings.scale || 1,

            // Width and height of the bounds
            staticInputWidth = staticInputBounds.right - staticInputBounds.left,
            staticInputHeight = staticInputBounds.bottom - staticInputBounds.top,
            visibleInputWidth = visibleInputBounds.right - visibleInputBounds.left,
            visibleInputHeight = visibleInputBounds.bottom - visibleInputBounds.top,
            paddedInputWidth = paddedInputBounds.right - paddedInputBounds.left,
            paddedInputHeight = paddedInputBounds.bottom - paddedInputBounds.top,

            // How much of the width is due to effects
            effectsInputWidth = visibleInputWidth - staticInputWidth,
            effectsInputHeight = visibleInputHeight - staticInputHeight,
            // How much of the width is due to padding (mask)
            paddingInputWidth = paddedInputWidth - visibleInputWidth,
            paddingInputHeight = paddedInputHeight - visibleInputHeight,

            // Designated image size
            paddedOutputWidthFloat = targetWidth || (paddedInputWidth *
                (targetHeight ? (targetHeight / paddedInputHeight) : targetScaleX)),
            paddedOutputHeightFloat = targetHeight || (paddedInputHeight *
                (targetWidth ? (targetWidth / paddedInputWidth) : targetScaleY)),

            // Effects are not scaled when the transformation is non-uniform
            paddedFloatRatioDiff = Math.abs(paddedOutputWidthFloat / paddedInputWidth -
                paddedOutputHeightFloat / paddedInputHeight),
            floatDiffEpislon = 2e-16,
            effectsScaled = (targetWidth || targetHeight) ? paddedFloatRatioDiff < floatDiffEpislon :
                targetScaleX === targetScaleY,

            paddedOutputWidth = Math.ceil(paddedOutputWidthFloat),
            paddedOutputHeight = Math.ceil(paddedOutputHeightFloat),

            paddedOutputScaleX = paddedOutputWidth / paddedInputWidth,
            paddedOutputScaleY = paddedOutputHeight / paddedInputHeight,

            // How much to scale everything that can be scaled (static + padding, maybe effects)
            scaleX = effectsScaled ? paddedOutputScaleX : paddedOutputScaleX +
                (effectsInputWidth * (paddedOutputScaleX - 1)) /
                (staticInputWidth + paddingInputWidth),
            scaleY = effectsScaled ? paddedOutputScaleY : paddedOutputScaleY +
                (effectsInputHeight * (paddedOutputScaleY - 1)) /
                (staticInputHeight + paddingInputHeight),

            // The expected size of the pixmap returned by Photoshop (does not include padding)
            visibleOutputWidth = effectsScaled ? scaleX * visibleInputWidth : scaleX * staticInputWidth + effectsInputWidth,
            visibleOutputHeight = effectsScaled ? scaleY * visibleInputHeight : scaleY * staticInputHeight + effectsInputHeight;

        // The settings for getPixmap
        return {
            // For backwards compatibility
            expectedWidth: visibleOutputWidth,
            expectedHeight: visibleOutputHeight,

            // For now: absolute scaling only
            inputRect: {
                left: staticInputBounds.left,
                top: staticInputBounds.top,
                right: staticInputBounds.left + staticInputWidth,
                bottom: staticInputBounds.top + staticInputHeight
            },
            outputRect: {
                left: 0,
                top: 0,
                right: visibleOutputWidth - effectsInputWidth * (effectsScaled ? scaleX : 1),
                bottom: visibleOutputHeight - effectsInputHeight * (effectsScaled ? scaleY : 1)
            },

            // The padding depends on the actual size of the returned image, therefore provide a function
            getPadding: function (pixmapWidth, pixmapHeight)
            {
                // Find out if the mask extends beyond the visible pixels
                let paddingWanted;
                ['top', 'left', 'right', 'bottom'].forEach(function (key)
                {
                    if (paddedInputBounds[key] !== visibleInputBounds[key])
                    {
                        paddingWanted = true;
                        return false;
                    }
                });

                // When Photoshop produces inaccurate results, the padding is adjusted to compensate
                // When no padding is requested, this may be unwanted, so return a padding of 0px
                if (!paddingWanted)
                {
                    return { left: 0, top: 0, right: 0, bottom: 0 };
                }

                let // How much padding is necessary in both dimensions
                    missingWidth = paddedOutputWidth - pixmapWidth,
                    missingHeight = paddedOutputHeight - pixmapHeight,

                    // How of the original padding was on which side (default 0)
                    leftRatio = paddingInputWidth === 0 ? 0 : ((visibleInputBounds.left - paddedInputBounds.left) / paddingInputWidth),
                    topRatio = paddingInputHeight === 0 ? 0 : ((visibleInputBounds.top - paddedInputBounds.top) / paddingInputHeight),

                    // Concrete padding size on one side so the other side can use the rest
                    leftPadding = Math.round(leftRatio * missingWidth),
                    topPadding = Math.round(topRatio * missingHeight);

                // Padding: how many transparent pixels to add on which side
                return {
                    left: leftPadding,
                    top: topPadding,
                    right: missingWidth - leftPadding,
                    bottom: missingHeight - topPadding
                };
            },

            getExtractParamsForDocBounds: function (finalWidth, finalHeight)
            {
                //if the image and effects are completely contained there is nothing more to do
                if (paddedInputBounds.top >= clipToBounds.top && paddedInputBounds.top <= clipToBounds.bottom &&
                    paddedInputBounds.left >= clipToBounds.left && paddedInputBounds.left <= clipToBounds.right &&
                    paddedInputBounds.right <= clipToBounds.right && paddedInputBounds.right >= clipToBounds.left &&
                    paddedInputBounds.bottom <= clipToBounds.bottom && paddedInputBounds.bottom >= clipToBounds.top)
                {
                    return;
                }

                //if the image and effects are completely outside there is nothing to extract
                if (paddedInputBounds.top > clipToBounds.bottom || paddedInputBounds.left > clipToBounds.right ||
                    paddedInputBounds.right < clipToBounds.left || paddedInputBounds.bottom < clipToBounds.top)
                {
                    return { x: 0, y: 0, height: 0, width: 0 };
                }

                let deltaTop = 0,
                    deltaLeft = 0,
                    deltaRight = 0,
                    deltaBottom = 0,
                    clipDeltaTop = Math.abs(Math.min(0, paddedInputBounds.top - clipToBounds.top)),
                    clipDeltaLeft = Math.abs(Math.min(0, paddedInputBounds.left - clipToBounds.left)),
                    clipDeltaRight = Math.abs(Math.min(0, clipToBounds.right - paddedInputBounds.right)),
                    clipDeltaBottom = Math.abs(Math.min(0, clipToBounds.bottom - paddedInputBounds.bottom));

                const calcScaledDelta = function (clipDelta, staticDelta, effectsDelta, paddingDelta, scale)
                {
                    let finalDelta = 0;
                    if (effectsScaled)
                    {
                        finalDelta = clipDelta * scale;
                    } else
                    {
                        finalDelta = Math.min(staticDelta, clipDelta) * scale;
                        clipDelta = Math.max(0, clipDelta - staticDelta);
                        finalDelta += Math.min(effectsDelta, clipDelta);
                        clipDelta = Math.max(0, clipDelta - staticDelta);
                        finalDelta += Math.min(paddingDelta, clipDelta);
                    }

                    return finalDelta;
                };

                //if we're cropping include any padding and effects on that side
                if (clipDeltaTop)
                {
                    const staticDeltaTop = Math.abs(Math.min(0, staticInputBounds.top - clipToBounds.top)),
                        effectsDeltaTop = staticInputBounds.top - visibleInputBounds.top,
                        paddingDeltaTop = visibleInputBounds.top - paddedInputBounds.top;

                    deltaTop = calcScaledDelta(clipDeltaTop, staticDeltaTop, effectsDeltaTop, paddingDeltaTop, scaleY);
                }

                if (clipDeltaLeft)
                {
                    const staticDeltaLeft = Math.abs(Math.min(0, staticInputBounds.left - clipToBounds.left)),
                        effectsDeltaLeft = staticInputBounds.left - visibleInputBounds.left,
                        paddingDeltaLeft = visibleInputBounds.left - paddedInputBounds.left;

                    deltaLeft = calcScaledDelta(clipDeltaLeft, staticDeltaLeft, effectsDeltaLeft, paddingDeltaLeft, scaleX);
                }

                if (clipDeltaRight)
                {
                    const staticDeltaRight = Math.abs(Math.min(0, clipToBounds.right - staticInputBounds.right)),
                        effectsDeltaRight = visibleInputBounds.right - staticInputBounds.right,
                        paddingDeltaRight = paddedInputBounds.right - visibleInputBounds.right;

                    deltaRight = calcScaledDelta(clipDeltaRight, staticDeltaRight, effectsDeltaRight, paddingDeltaRight, scaleX);
                }

                if (clipDeltaBottom)
                {
                    const staticDeltaBottom = Math.abs(Math.min(0, clipToBounds.bottom - staticInputBounds.bottom)),
                        effectsDeltaBottom = visibleInputBounds.bottom - staticInputBounds.bottom,
                        paddingDeltaBottom = paddedInputBounds.bottom - visibleInputBounds.bottom;

                    deltaBottom = calcScaledDelta(clipDeltaBottom, staticDeltaBottom, effectsDeltaBottom, paddingDeltaBottom, scaleY);
                }

                return {
                    x: Math.round(deltaLeft),
                    y: Math.round(deltaTop),
                    width: Math.round(finalWidth - deltaLeft - deltaRight),
                    height: Math.round(finalHeight - deltaTop - deltaBottom)
                };

            }
        };
    }

}

/** 
 * Gets a TypeID out of the specified StringID.
 * @param {String} stringId StringID.
 * @return {Promise} A promise that resolves to the TypeID.
 */
PhotoshopInterface.prototype.stringIDToTypeID = PhotoshopInterface.prototype.charIDToTypeID;

// Alias for onPhotoshopEvent
PhotoshopInterface.prototype.addPhotoshopEventListener = PhotoshopInterface.prototype.onPhotoshopEvent;
