
var LogLevels = require('./Log.js').LogLevels;

import { EventEmitter } from 'events';
import extend from 'extend';

// Utilities
function parseMenuItemJSON(menu)
{
    if (!(menu instanceof Array))
    {
        throw new TypeError('Menu should be an array of objects describing menu items.');
    }

    var xml = '',
        hasOwnProperty = Object.prototype.hasOwnProperty;

    for (var i = 0; i < menu.length; i++)
    {
        var item = menu[i];

        if (!hasOwnProperty.call(item, 'label'))
        {
            // Item should at least have a label
            continue;
        }

        if (item.label === '---')
        {
            // Separator, quick exit
            xml += '<MenuItem Label="---" />';
        }
        else
        {
            // Label
            var itemXml = '<MenuItem Label="' + item.label + '"';

            // Id
            if (hasOwnProperty.call(item, 'id'))
            {
                itemXml += ' Id="' + item.id + '"';
            }

            // Menu
            if (hasOwnProperty.call(item, 'menu'))
            {
                // Submenu, recurse
                itemXml += '>';
                itemXml += parseMenuItemJSON(item.menu);
                itemXml += '</MenuItem>';
            }
            else
            {
                // Enabled
                if (hasOwnProperty.call(item, 'enabled'))
                {
                    itemXml += ' Enabled="' + item.enabled + '"';
                }

                // Checkable
                if (hasOwnProperty.call(item, 'checkable'))
                {
                    itemXml += ' Checkable="' + item.checkable + '"';
                }

                // Checked
                if (hasOwnProperty.call(item, 'checked'))
                {
                    itemXml += ' Checked="' + item.checked + '"';
                }

                // Icon
                if (hasOwnProperty.call(item, 'icon'))
                {
                    itemXml += ' Icon="' + item.icon + '"';
                }

                itemXml += ' />';
                xml += itemXml;
            }
        }
    }

    return xml;
}

function parseMenuJSON(menu)
{
    if (!Object.prototype.hasOwnProperty.call(menu, 'menu'))
    {
        throw new TypeError('Invalid menu JSON');
    }

    return '<Menu>' + parseMenuItemJSON(menu.menu) + '</Menu>';
}

/**
 * Utility class that wraps most CEP and CSInterface methods and adds new ones.
 */
function CEP(application)
{
    EventEmitter.call(this);

    Object.defineProperties(this, {

        application: { value: application, enumerable: true },

        logger: { value: application.logManager.createLogger('CEP', LogLevels.DEBUG), enumerable: true },

    });

    // We use an event for extension unloading
    this.cep.util.registerExtensionUnloadCallback(function ()
    {
        this.emit('unload');

    }.bind(this));

    this.cep.util._registerExtensionUnloadCallback = this.cep.util.registerExtensionUnloadCallback;
    this.cep.util.registerExtensionUnloadCallback = function ()
    {
        this.logger.warn('Please use the "unload" event, fired by "Core.application.cep" instead of calling "registerExtensionUnloadCallback" directly.');

    }.bind(this);
}

// Prototype
CEP.constructor = CEP;
CEP.prototype = Object.create(EventEmitter.prototype, {

    /**
     * Inner CEP instance (window.cep).
     */
    cep: { get: function () { return window.cep; }, enumerable: true },

    /**
     * CSInterface instance.
     */
    csInterface: { value: typeof CSInterface === 'function' ? new CSInterface() : null, enumerable: true },

    /**
     * API version. An object with major, minor, micro version information.
     * @type {Object}
     */
    APIVersion: {
        value: (function ()
        {
            var version = JSON.parse(window.__adobe_cep__.getCurrentApiVersion());
            return Object.freeze(version);
        })(),
        enumerable: true,
    },

    /**
     * A list of supported functionality (changes based on CEP version).
     */
    supports: {
        value: (function ()
        {
            var version = JSON.parse(window.__adobe_cep__.getCurrentApiVersion()),
                hostCapabilities = JSON.parse(window.__adobe_cep__.getHostCapabilities());

            return Object.freeze({

                flyoutMenu: !!hostCapabilities.EXTENDED_PANEL_MENU,

                contextMenu: (version.major >= 6 || (version.major >= 5 && version.minor >= 2)),

                contextMenuByJSON: (version.major >= 6),

                keyEventsInterest: (version.major >= 6 && version.minor >= 1),

            });
        })(),
        enumerable: true,
    },

    /** A list of key events we're interested in. */
    _interestingKeyEvents: { value: [] },

});

/** 
 * Evaluates the specified ExtendScript.
 * @param {String} script ExtendScript script.
 * @param {Object} [params={}] Script parameters.
 * @return {Promise} A promise.
 */
CEP.prototype.evalScript = function (script, params)
{
    var self = this;

    return new Promise(function (resolve, reject)
    {
        var paramsString;

        if (typeof params === 'object')
        {
            paramsString = 'var params = ' + JSON.stringify(params) + ';';
        }
        else
        {
            paramsString = 'var params = null;';
        }

        self.logger.debug('evalScript:\n', paramsString + script);

        self.csInterface.evalScript(paramsString + script, function (response)
        {
            if (response === 'EvalScript error.')
            {
                reject(response);
            }
            else
            {
                resolve(response);
            }
        });

    });
};

/**
 * Registers a CS Event callback.
 * @param {String} type The Event type.
 * @param {Function} callback Callback function.
 * @param {Object} context Callback context.
 */
CEP.prototype.addEventListener = function (type, callback, context)
{
    this.logger.debug('addEventListener:', type);
    this.csInterface.addEventListener(type, callback, context);
};

/**
 * Unregisters a CS Event callback.
 * @param {String} type The Event type.
 * @param {Function} callback Callback function.
 * @param {Object} context Callback context.
 */
CEP.prototype.removeEventListener = function (type, callback, context)
{
    this.logger.debug('removeEventListener:', type);
    this.csInterface.removeEventListener(type, callback, context);
};

/**
 * Triggers a CS Event programmatically.
 * @param {CSEvent} event The event to trigger.
 */
CEP.prototype.dispatchEvent = function (event)
{
    this.logger.debug('dispatchEvent:', event);
    this.csInterface.dispatchEvent(event);
};

/**
 * Gets the identifier of the current extension.
 * @return A string identifier of the current extension.
 */
CEP.prototype.getExtensionId = function ()
{
    this.logger.debug('getExtensionId');
    return window.__adobe_cep__.getExtensionId();
};

/**
 * Gets the host environment data object.
 * @return A data object of the current host environment.
 */
CEP.prototype.getHostEnvironment = function ()
{
    this.logger.debug('getExtensionId');
    return JSON.parse(window.__adobe_cep__.getHostEnvironment());
};

/**
 * Gets a system path.
 * @param {String} pathType A string containing a path-type constant defined in the SystemPath class, such as SystemPath.USER_DATA.
 * @return {String} A path string.
 */
CEP.prototype.getSystemPath = function (pathType)
{
    this.logger.debug('getSystemPath:', pathType);
    return this.csInterface.getSystemPath(pathType);
};

/**
 * Opens the specified extension.
 */
CEP.prototype.requestOpenExtension = function (extensionId, params)
{
    this.logger.debug('requestOpenExtension:', extensionId, params);
    this.csInterface.requestOpenExtension(extensionId, params);
};

/** 
 * Shows an ExtendScript alert.
 * @param {String} text Alert text.
 * @param {String} title Alert title.
 */
CEP.prototype.alert = function (text, title)
{
    var params = { text: text, title: (title || this.application.extension.name) };
    return this.evalScript('alert(params.text,params.title)', params);
};

/** 
 * Opens a page in the default system browser.
 * @param {string} url The URL of the page to open. Must use HTTP or HTTPS.
 */
CEP.prototype.openURLInDefaultBrowser = function (url)
{
    this.logger.debug('openURLInDefaultBrowser(', url, ')');
    this.cep.util.openURLInDefaultBrowser(url);
};

/** 
 * Makes the panel persistent.
 */
CEP.prototype.makePersistent = function ()
{
    this.logger.debug('makePersistent');

    var event = new CSEvent('com.adobe.PhotoshopPersistent', 'APPLICATION');
    event.extensionId = window.__adobe_cep__.getExtensionId();
    this.csInterface.dispatchEvent(event);
};

/** 
 * Makes the panel non-persistent.
 */
CEP.prototype.makeUnPersistent = function ()
{
    this.logger.debug('makeUnPersistent');

    var event = new CSEvent('com.adobe.PhotoshopUnPersistent', 'APPLICATION');
    event.extensionId = window.__adobe_cep__.getExtensionId();
    this.csInterface.dispatchEvent(event);
};

/**
 * Gets information about the current extension.
 * @return {Object} An object containing information about the current extension.
 */
CEP.prototype.getExtensionInfo = function ()
{
    this.logger.debug('getExtensionInfo');
    return this.csInterface.getExtensions([window.__adobe_cep__.getExtensionId()])[0];
};

/**
 * Sets panel flyout menu by a JSON object.
 * @param {Object} menu The menu, refer to format below.
 * @return {Boolean} True if the flyout menu was set; otherwise, false.
 *
 * An example menu JSON:
 *
 * { 
 *      "menu": [
 *          {
 *              "id": "menuItemId1",
 *              "label": "testExample1",
 *              "enabled": true,
 *              "checkable": true,
 *              "checked": false,
 *              "icon": "./image/small_16X16.png"
 *          },
 *          {
 *              "id": "menuItemId2",
 *              "label": "testExample2",
 *              "menu": [
 *                  {
 *                      "id": "menuItemId2-1",
 *                      "label": "testExample2-1",
 *                      "menu": [
 *                          {
 *                              "id": "menuItemId2-1-1",
 *                              "label": "testExample2-1-1",
 *                              "enabled": false,
 *                              "checkable": true,
 *                              "checked": true
 *                          }
 *                      ]
 *                  },
 *                  {
 *                      "id": "menuItemId2-2",
 *                      "label": "testExample2-2",
 *                      "enabled": true,
 *                      "checkable": true,
 *                      "checked": true
                    }
 *              ]
 *          },
 *          {
 *              "label": "---"
 *          },
 *          {
 *              "id": "menuItemId3",
 *              "label": "testExample3",
 *              "enabled": false,
 *              "checkable": true,
 *              "checked": false
 *          }
 *      ]
 *  }
 */
CEP.prototype.setPanelFlyoutMenu = function (menu)
{
    this.logger.debug('setPanelFlyoutMenu:', menu);

    if (this.supports.flyoutMenu)
    {
        var xml = parseMenuJSON(menu);
        this.csInterface.setPanelFlyoutMenu(xml);
        return true;
    }

    return false;
};

/**
 * Updates a menu item in the extension window's flyout menu, by setting the enabled
 * and selection status.
 * @param {String} menuItemLabel The menu item label. 
 * @param {Boolean} [enabled] True to enable the item, false to disable it (gray it out).
 * @param {Boolean} [checked] True to select the item, false to deselect it.
 * @return {Boolean} True if the menu item was updated; otherwise, false.
 */
CEP.prototype.updatePanelMenuItem = function (menuItemLabel, enabled, checked)
{
    this.logger.debug('updatePanelMenuItem:', menuItemLabel, enabled, checked);
    return this.csInterface.updatePanelMenuItem(menuItemLabel, !!enabled, !!checked);
};

/**
 * Sets context menu by a JSON object.
 * @param {Object} menu The menu, refer to format below.
 * @param {Function} callback The callback function which is called when a menu item is clicked.
 * The only parameter of the function is the returned ID of clicked menu item.
 * @return {Boolean} True if the context menu was set; otherwise, false.
 *
 * An example menu JSON:
 *
 * { 
 *      "menu": [
 *          {
 *              "id": "menuItemId1",
 *              "label": "testExample1",
 *              "enabled": true,
 *              "checkable": true,
 *              "checked": false,
 *              "icon": "./image/small_16X16.png"
 *          },
 *          {
 *              "id": "menuItemId2",
 *              "label": "testExample2",
 *              "menu": [
 *                  {
 *                      "id": "menuItemId2-1",
 *                      "label": "testExample2-1",
 *                      "menu": [
 *                          {
 *                              "id": "menuItemId2-1-1",
 *                              "label": "testExample2-1-1",
 *                              "enabled": false,
 *                              "checkable": true,
 *                              "checked": true
 *                          }
 *                      ]
 *                  },
 *                  {
 *                      "id": "menuItemId2-2",
 *                      "label": "testExample2-2",
 *                      "enabled": true,
 *                      "checkable": true,
 *                      "checked": true
                    }
 *              ]
 *          },
 *          {
 *              "label": "---"
 *          },
 *          {
 *              "id": "menuItemId3",
 *              "label": "testExample3",
 *              "enabled": false,
 *              "checkable": true,
 *              "checked": false
 *          }
 *      ]
 *  }
 */
CEP.prototype.setContextMenu = function (menu, callback)
{
    this.logger.debug('setContextMenu:', menu, callback);

    if (this.supports.contextMenu)
    {
        if (typeof callback !== 'function')
        {
            callback = function () { };
        }

        if (this.supports.contextMenuByJSON)
        {
            this.csInterface.setContextMenu(JSON.stringify(menu), callback);
        }
        else
        {
            var xml = parseMenuJSON(menu);
            this.csInterface.setContextMenu(xml, callback);
        }

        return true;
    }

    return false;
};

/**
 * Updates a context menu item by setting the enabled and selection status.
 * @param {String} menuItemID The menu item ID. 
 * @param {Boolean} [enabled] True to enable the item, false to disable it (gray it out).
 * @param {Boolean} [checked] True to select the item, false to deselect it.
 * @return {Boolean} True if the context menu was updated; otherwise, false.
 */
CEP.prototype.updateContextMenuItem = function (menuItemID, enabled, checked)
{
    this.logger.debug('updateContextMenuItem:', menuItemID, enabled, checked);

    if (this.supports.contextMenu)
    {
        this.csInterface.updateContextMenuItem(menuItemID, !!enabled, !!checked);
        return true;
    }

    return false;
};

/**
 * Registers an interest in the specified key events so they are routed
 * to the extension before being sent to the host application.
 * @param {...Object} args Key event descriptors, @see CSInterface.prototype.registerKeyEventsInterest for details.
 */
CEP.prototype.registerKeyEventsInterest = function ()
{
    if (!this.supports.keyEventsInterest)
    {
        return;
    }

    var events = [],
        shouldUpdate = false;

    // Get valid events from arguments
    for (let i = 0; i < arguments.length; i++)
    {
        if (typeof arguments[i] === 'object')
        {
            events.push(extend({

                keyCode: -1,
                ctrlKey: false,
                altKey: false,
                shiftKey: false,
                metaKey: false,

            }, arguments[i]));
        }
    }

    for (let i = 0; i < events.length; i++)
    {
        var event = events[i],
            alreadyRegistered = false;

        // If the event is already registered, increment count
        for (var j = 0; j < this._interestingKeyEvents.length; j++)
        {
            var registered = this._interestingKeyEvents[j];

            if (registered.event.keyCode === event.keyCode
                && registered.event.ctrlKey === event.ctrlKey
                && registered.event.altKey === event.altKey
                && registered.event.shiftKey === event.shiftKey
                && registered.event.metaKey === event.metaKey)
            {
                registered.count++;
                alreadyRegistered = true;
                break;
            }
        }

        if (!alreadyRegistered)
        {
            // New event
            this._interestingKeyEvents.push({ event: event, count: 1 });
            shouldUpdate = true;
        }
    }

    if (shouldUpdate)
    {
        this._updateKeyEventsInterest();
    }
};

/**
 * Unregisters interest in the specified key events.
 * @param {Object} ...args Key event descriptors, @see CSInterface.prototype.registerKeyEventsInterest for details.
 */
CEP.prototype.unregisterKeyEventsInterest = function ()
{
    if (!this.supports.keyEventsInterest)
    {
        return;
    }

    var events = [],
        shouldUpdate = false;

    // Get valid events from arguments
    for (let i = 0; i < arguments.length; i++)
    {
        if (typeof arguments[i] === 'object')
        {
            events.push(extend({

                keyCode: -1,
                ctrlKey: false,
                altKey: false,
                shiftKey: false,
                metaKey: false,

            }, arguments[i]));
        }
    }

    for (let i = 0; i < events.length; i++)
    {
        var event = events[i];

        // If event is registered, decrement count and eventually remove
        // it completely if we're no longer interested at intercepting it
        for (var j = 0; j < this._interestingKeyEvents.length; j++)
        {
            var registered = this._interestingKeyEvents[j];

            if (registered.event.keyCode === event.keyCode
                && registered.event.ctrlKey === event.ctrlKey
                && registered.event.altKey === event.altKey
                && registered.event.shiftKey === event.shiftKey
                && registered.event.metaKey === event.metaKey)
            {
                registered.count--;

                if (registered.count <= 0)
                {
                    this._interestingKeyEvents.splice(j, 1);
                    shouldUpdate = true;
                }

                break;
            }
        }
    }

    if (shouldUpdate)
    {
        this._updateKeyEventsInterest();
    }
};

/**
 * @private
 */
CEP.prototype._updateKeyEventsInterest = function ()
{
    if (this._interestingKeyEvents.length > 0)
    {
        var events = this._interestingKeyEvents.reduce(function (array, registered)
        {
            array.push(registered.event);
            return array;

        }, []);

        this.logger.debug('Interesting key events:', events);
        this.csInterface.registerKeyEventsInterest(JSON.stringify(events));
    }
    else
    {
        this.logger.debug('Interesting key events: none.');
        this.csInterface.registerKeyEventsInterest('');
    }
};

module.exports = CEP;
