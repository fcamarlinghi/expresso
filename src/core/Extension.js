
import { EventEmitter } from 'events';
import extend from 'extend';
import path from 'path';

import { assert, assertType } from './assert.js';
import Logger, { LogManager } from './Logger.js';
import Settings from './Settings.js';
import Theme from './Theme.js';

/** Gets log directory path. */
function getLogFolder(folder)
{
    if (process.platform === 'darwin')
    {
        return path.join(process.env.HOME || '', 'Library', 'Logs', folder);
    }
    else if (process.platform === 'win32')
    {
        return path.join(process.env.APPDATA || '', folder, 'logs');
    }
    else
    {
        return path.join(process.env.HOME || '', folder, 'logs');
    }
}

/** Gets data directory path. */
function getDataFolder(folder)
{
    if (process.platform === 'darwin')
    {
        return path.join(process.env.APPDATA || '', 'Library', 'Application Support', folder);
    }
    else if (process.platform === 'win32')
    {
        return path.join(process.env.APPDATA || '', folder);
    }
    else
    {
        return path.join(process.env.HOME || '', folder);
    }
}

/** Default logger. */
export const defaultLogger = new Logger('Extension');

/** Singleton instance. */
let singleton = null;

/**
 * Main extension class, providing access to settings, theme, etc.
 */
export default class Extension extends EventEmitter
{

    /** 
     * Creates the extension singleton instance.
     * @param {Object} options Options.
     * @param {String} options.name Extension name.
     * @param {String} options.vendor Extension vendor.
     * @param {String} options.version Extension version.
     * @param {Object} [options.log] Options passed to the log manager.
     * @param {Object} [options.settings] Options passed to the settings manager.
     */
    static create(options)
    {
        try
        {
            assert(!Extension.isInitialized(), 'The Extension singleton has already been initialized.');
            singleton = new Extension(options);
        }
        catch (error) 
        {
            // If we're here a major error has occurred, make sure it gets noticed
            if (Extension.isInitialized())
            {
                defaultLogger.error('Could not initialize extension: %o', error);
            }

            document.write(`Could not initialize extension: ${error.toString()}`);
            throw error;
        }
        return singleton;
    }

    /** Gets the extension singleton. */
    static get()
    {
        assert(Extension.isInitialized(), 'Trying to access the Extension singleton before it has been initialized.');
        return singleton;
    }

    /** Gets whether the extension singleton has been initialized. */
    static isInitialized()
    {
        return (singleton !== null);
    }

    /** 
     * Constructor.
     * Do not use directly, @see Extension.create
     * @private
     */
    constructor(options)
    {
        super();

        // Parse parameters
        const parsed = extend(true, {

            name: null,
            vendor: null,
            version: null,

            folder: null,

            log: {},
            settings: {},

        }, options);

        assertType(!String.isEmpty(parsed.name), 'Extension name should be a non-empty string.');
        assertType(!String.isEmpty(parsed.vendor), 'Extension vendor should be a non-empty string.');
        assertType(!String.isEmpty(parsed.version), 'Extension version should be a non-empty string.');
        assertType(!String.isEmpty(parsed.folder), 'Extension folder should be a non-empty string.');

        // Define base properties
        Object.defineProperties(this, {

            /**
             * Extension info.
             * @type {Object}
             */
            info: {
                value: Object.freeze({ name: parsed.name, vendor: parsed.vendor, version: parsed.version }),
                enumerable: true,
            },

            /**
             * Extension folders.
             * @type {Object}
             */
            folders: {
                value: Object.freeze({ data: getDataFolder(parsed.folder), logs: getLogFolder(parsed.folder) }),
                enumerable: true,
            },

            /**
             * Active slow task.
             * @type {SlowTask}
             * @private
             */
            _slowTask: { value: null, writable: true },

        });

        // Initialize the log manager
        LogManager.create(extend({ folder: this.folders.logs }, parsed.log));

        // Initialize utilities
        Object.defineProperties(this, {

            /**
             * Settings manager.
             * @type {Settings}
             */
            settings: { value: new Settings(extend({ folder: this.folders.data }, parsed.settings)), enumerable: true },

            /**
             * Theme manager.
             * @type {Theme}
             */
            theme: { value: new Theme(), enumerable: true },

        });

        // Use our own unload callback
        window.cep.util.registerExtensionUnloadCallback(() => this.emit('unload'));
        window.cep.util._registerExtensionUnloadCallback = window.cep.util.registerExtensionUnloadCallback;
        window.cep.util.registerExtensionUnloadCallback = () => { defaultLogger.warn('Please use the "unload" event, fired by the Extension singleton instead of calling "registerExtensionUnloadCallback" directly.'); };
        this.on('unload', () => defaultLogger.info('Shutting down...'));

        // Load settings
        this.settings.load();

        // We're done
        defaultLogger.info('Extension', parsed.vendor, parsed.name, parsed.version, 'initialized.');
        this.emit('loaded');
    }

}
