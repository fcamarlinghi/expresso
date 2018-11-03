
import extend from 'extend';
import Logger from './Logger.js';

/////////////////////////////////////////////////////////////////////////////////////////////
// Type definitions

/**
 * @typedef {Object} HostEnvironment
 * @property {String} appName The application's name.
 * @property {String} appVersion The application's version.
 * @property {String} appLocale The application's current license locale.
 * @property {String} appUILocale The application's current UI locale.
 * @property {String} appId The application's unique identifier.
 * @property {String} isAppOnline True if the application is currently online.
 * @property {AppSkinInfo} appSkinInfo An object containing the application's default color and font styles.
 */

/**
 * @typedef {Object} HostExtension
 * @property {String} id The unique identifier of this extension.
 * @property {String} name The localizable display name of this extension.
 * @property {String} mainPath The path of the "index.html" file.
 * @property {String} basePath The base path of this extension.
 * @property {String} windowType The window type of the main window of this extension. Valid values are defined by @see CSXSWindowType.
 * @property {Number} width The default width in pixels of the main window of this extension.
 * @property {Number} height The default height in pixels of the main window of this extension.
 * @property {Number} minWidth The minimum width in pixels of the main window of this extension.
 * @property {Number} minHeight The minimum height in pixels of the main window of this extension.
 * @property {Number} maxWidth The maximum width in pixels of the main window of this extension.
 * @property {Number} maxHeight The maximum height in pixels of the main window of this extension.
 * @property {String} defaultExtensionDataXml The extension data contained in the default @see ExtensionDispatchInfo section of the extension manifest.
 * @property {String} specialExtensionDataXml The extension data contained in the application-specific @see ExtensionDispatchInfo section of the extension manifest.
 * @property {String} requiredRuntimeList An array of @see Runtime objects for runtimes required by this extension.
 * @property {Boolean} isAutoVisible True if this extension is visible on loading.
 * @property {Boolean} isPluginExtension True if this extension has been deployed in the Plugins folder of the host application.
 */

 /////////////////////////////////////////////////////////////////////////////////////////////

function parseMenuItemJSON(menu)
{
    if (!(menu instanceof Array))
    {
        throw new TypeError('Menu should be an array of objects describing menu items.');
    }

    let xml = '',
        hasOwnProperty = Object.prototype.hasOwnProperty;

    for (let i = 0; i < menu.length; i++)
    {
        let item = menu[i];

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
            let itemXml = '<MenuItem Label="' + item.label + '"';

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

/** Logger. */
const logger = new Logger('CEP');

/** A list of key events we're interested in. */
const interestingKeyEvents = [];

/** CSInterface instance. */
const csInterface = new CSInterface();

/**
 * Static utilities that wraps most CEP and CSInterface methods and adds new ones.
 */
export default class CEP
{

    /** 
     * Evaluates the specified ExtendScript.
     * @param {String} script ExtendScript script.
     * @param {Object} [params={}] Script parameters.
     * @return {Promise.<String>} A promise.
     */
    static evalScript(script, params)
    {
        return new Promise((resolve, reject) =>
        {
            const evalString = `var params = ${(typeof params === 'object') ? JSON.stringify(params) : 'null'};${script}`;
            logger.debug('evalScript:\n', evalString);

            csInterface.evalScript(evalString, (response) =>
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
    }

    /**
     * Registers a CS Event callback.
     * @param {String} type The Event type.
     * @param {Function} callback Callback function.
     * @param {Object} context Callback context.
     */
    static addEventListener(type, callback, context)
    {
        logger.debug('addEventListener:', type);
        csInterface.addEventListener(type, callback, context);
    }

    /**
     * Unregisters a CS Event callback.
     * @param {String} type The Event type.
     * @param {Function} callback Callback function.
     * @param {Object} context Callback context.
     */
    static removeEventListener(type, callback, context)
    {
        logger.debug('removeEventListener:', type);
        csInterface.removeEventListener(type, callback, context);
    }

    /**
     * Triggers a CS Event programmatically.
     * @param {String} name Name of the event.
     * @param {Object|String} data Event data.
     * @param {String} [scope] Event scope, can be "GLOBAL" or "APPLICATION". Defaults to "APPLICATION".
     */
    static dispatchEvent(name, data, scope)
    {
        scope || (scope = 'APPLICATION');
        logger.debug('dispatchEvent:', name);

        const event = new CSEvent(name, scope, CEP.getHostEnvironment().appName, CEP.getExtensionId())
        event.data = data;
        csInterface.dispatchEvent(event);
    }

    /**
     * Gets the identifier of the current extension.
     * @return {String} A string identifier of the current extension.
     */
    static getExtensionId()
    {
        logger.debug('getExtensionId');
        return window.__adobe_cep__.getExtensionId();
    }

    /**
     * Gets the host environment data object.
     * @return {HostEnvironment} The current host environment.
     */
    static getHostEnvironment()
    {
        logger.debug('getHostEnvironment');
        return csInterface.getHostEnvironment();
    }

    /**
     * Gets a system path.
     * @param {String} pathType A string containing a path-type constant defined in the SystemPath class, such as SystemPath.USER_DATA.
     * @return {String} A path string.
     */
    static getSystemPath(pathType)
    {
        logger.debug('getSystemPath:', pathType);
        return csInterface.getSystemPath(pathType);
    }

    /**
     * Opens the specified extension.
     * @param {String} extensionId The ID of the extension to open.
     */
    static requestOpenExtension(extensionId, params)
    {
        logger.debug('requestOpenExtension:', extensionId, params);
        csInterface.requestOpenExtension(extensionId, params);
    }

    /**
     * Closes the current extension.
     */
    static closeExtension()
    {
        logger.debug('closeExtension');
        csInterface.closeExtension();
    }

    /** 
     * Shows an ExtendScript alert.
     * @param {String} text Alert text.
     * @param {String} title Alert title.
     */
    static alert(text, title)
    {
        const params = { text: text, title: (title || CEP.getExtensionInfo().name) };
        return CEP.evalScript('alert(params.text,params.title)', params);
    }

    /** 
     * Opens a page in the default system browser.
     * @param {string} url The URL of the page to open. Must use HTTP or HTTPS.
     */
    static openURLInDefaultBrowser(url)
    {
        logger.debug('openURLInDefaultBrowser(', url, ')');
        window.cep.util.openURLInDefaultBrowser(url);
    }

    /** 
     * Makes the panel persistent.
     */
    static makePersistent()
    {
        logger.debug('makePersistent');

        var event = new CSEvent('com.adobe.PhotoshopPersistent', 'APPLICATION');
        event.extensionId = window.__adobe_cep__.getExtensionId();
        csInterface.dispatchEvent(event);
    }

    /** 
     * Makes the panel non-persistent.
     */
    static makeUnPersistent()
    {
        logger.debug('makeUnPersistent');

        var event = new CSEvent('com.adobe.PhotoshopUnPersistent', 'APPLICATION');
        event.extensionId = window.__adobe_cep__.getExtensionId();
        csInterface.dispatchEvent(event);
    }

    /**
     * Gets information about the current extension.
     * @return {HostExtension} An object containing information about the current extension.
     */
    static getExtensionInfo()
    {
        logger.debug('getExtensionInfo');
        return csInterface.getExtensions([window.__adobe_cep__.getExtensionId()])[0];
    }

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
    static setPanelFlyoutMenu(menu)
    {
        logger.debug('setPanelFlyoutMenu:', menu);

        if (CEP.supports.flyoutMenu)
        {
            var xml = parseMenuJSON(menu);
            csInterface.setPanelFlyoutMenu(xml);
            return true;
        }

        return false;
    }

    /**
     * Updates a menu item in the extension window's flyout menu, by setting the enabled
     * and selection status.
     * @param {String} menuItemLabel The menu item label. 
     * @param {Boolean} [enabled] True to enable the item, false to disable it (gray it out).
     * @param {Boolean} [checked] True to select the item, false to deselect it.
     * @return {Boolean} True if the menu item was updated; otherwise, false.
     */
    static updatePanelMenuItem(menuItemLabel, enabled, checked)
    {
        logger.debug('updatePanelMenuItem:', menuItemLabel, enabled, checked);
        return csInterface.updatePanelMenuItem(menuItemLabel, !!enabled, !!checked);
    }

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
    static setContextMenu(menu, callback)
    {
        logger.debug('setContextMenu:', menu, callback);

        if (CEP.supports.contextMenu)
        {
            if (typeof callback !== 'function')
            {
                callback = function () { };
            }

            if (CEP.supports.contextMenuByJSON)
            {
                csInterface.setContextMenu(JSON.stringify(menu), callback);
            }
            else
            {
                const xml = parseMenuJSON(menu);
                csInterface.setContextMenu(xml, callback);
            }

            return true;
        }

        return false;
    }

    /**
     * Updates a context menu item by setting the enabled and selection status.
     * @param {String} menuItemID The menu item ID. 
     * @param {Boolean} [enabled] True to enable the item, false to disable it (gray it out).
     * @param {Boolean} [checked] True to select the item, false to deselect it.
     * @return {Boolean} True if the context menu was updated; otherwise, false.
     */
    static updateContextMenuItem(menuItemID, enabled, checked)
    {
        logger.debug('updateContextMenuItem:', menuItemID, enabled, checked);

        if (CEP.supports.contextMenu)
        {
            csInterface.updateContextMenuItem(menuItemID, !!enabled, !!checked);
            return true;
        }

        return false;
    }

    /**
     * Registers an interest in the specified key events so they are routed
     * to the extension before being sent to the host application.
     * @param {...Object} args Key event descriptors, @see CSInterface.prototype.registerKeyEventsInterest for details.
     */
    static registerKeyEventsInterest()
    {
        if (!CEP.supports.keyEventsInterest)
        {
            return;
        }

        let events = [],
            shouldUpdate = false;

        // Get valid events from arguments
        for (let i = 0; i < arguments.length; i++)
        {
            if (typeof arguments[i] === 'object' && arguments[i].keyCode > 0)
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
            let event = events[i],
                alreadyRegistered = false;

            // If the event is already registered, increment count
            for (let j = 0; j < interestingKeyEvents.length; j++)
            {
                let registered = interestingKeyEvents[j];

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
                interestingKeyEvents.push({ event: event, count: 1 });
                shouldUpdate = true;
            }
        }

        if (shouldUpdate)
        {
            CEP._updateKeyEventsInterest();
        }
    }

    /**
     * Unregisters interest in the specified key events.
     * @param {Object} ...args Key event descriptors, @see CSInterface.prototype.registerKeyEventsInterest for details.
     */
    static unregisterKeyEventsInterest()
    {
        if (!CEP.supports.keyEventsInterest)
        {
            return;
        }

        let events = [],
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
            let event = events[i];

            // If event is registered, decrement count and eventually remove
            // it completely if we're no longer interested at intercepting it
            for (let j = 0; j < interestingKeyEvents.length; j++)
            {
                let registered = interestingKeyEvents[j];

                if (registered.event.keyCode === event.keyCode
                    && registered.event.ctrlKey === event.ctrlKey
                    && registered.event.altKey === event.altKey
                    && registered.event.shiftKey === event.shiftKey
                    && registered.event.metaKey === event.metaKey)
                {
                    registered.count--;

                    if (registered.count <= 0)
                    {
                        interestingKeyEvents.splice(j, 1);
                        shouldUpdate = true;
                    }

                    break;
                }
            }
        }

        if (shouldUpdate)
        {
            CEP._updateKeyEventsInterest();
        }
    }

    /**
     * @private
     */
    static _updateKeyEventsInterest()
    {
        if (interestingKeyEvents.length > 0)
        {
            let events = interestingKeyEvents.reduce(function (array, registered)
            {
                array.push(registered.event);
                return array;

            }, []);

            logger.debug('Interesting key events:', events);
            csInterface.registerKeyEventsInterest(JSON.stringify(events));
        }
        else
        {
            logger.debug('Interesting key events: none.');
            csInterface.registerKeyEventsInterest('');
        }
    }

}

// Static helpers
Object.defineProperties(CEP, {

    /**
     * API version. An object with major, minor, micro version information.
     * @type {Object}
     */
    APIVersion: {
        value: (function ()
        {
            const version = JSON.parse(window.__adobe_cep__.getCurrentApiVersion());
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
            const version = JSON.parse(window.__adobe_cep__.getCurrentApiVersion()),
                hostCapabilities = JSON.parse(window.__adobe_cep__.getHostCapabilities());

            return Object.freeze({

                flyoutMenu: !!hostCapabilities.EXTENDED_PANEL_MENU,

                contextMenu: (version.major >= 6 || (version.major >= 5 && version.minor >= 2)),

                contextMenuByJSON: (version.major >= 6),

                keyEventsInterest: (version.major > 6 || (version.major === 6 && version.minor >= 1)),

            });
        })(),
        enumerable: true,
    },

});
