
import fs from 'fs';
import path from 'path';
import util from 'util';

import extend from 'extend';
import sanitize from 'sanitize-filename';
import { assert, assertType } from './assert.js';

////////////////////////////////////////////////////////////////////////////////////////////

/**
 * Log levels.
 * @readonly
 * @enum {String}
 */
export const LogLevels = Object.freeze(Object.create(null, {

    'NONE': {
        value: { css: 'color:#000', priority: 0 },
        writable: false,
        enumerable: true
    },

    'ERROR': {
        value: { css: 'color:#e84715', priority: 1 },
        writable: false,
        enumerable: true
    },

    'WARNING': {
        value: { css: 'color:#e8b415', priority: 2 },
        writable: false,
        enumerable: true
    },

    'INFO': {
        value: { css: 'color:#3787cb', priority: 3 },
        writable: false,
        enumerable: true
    },

    'DEBUG': {
        value: { css: 'color:#576f29', priority: 4 },
        writable: false,
        enumerable: true
    },

}));

/** Log manager singleton. */
let singleton = null;

/**
 * Log manager.
 */
export class LogManager
{
    /**
     * Constructor.
     * Should not be used directly, @see LogManager.create
     * @param {Object} options Options.
     * @param {String} options.folder Folder where the log file should be stored.
     * @param {String} [options.filename] Name of the log file.
     * @param {String} [options.encoding] Log file encoding.
     */
    constructor(options)
    {
        const parsed = extend({
            folder: null,
            filename: 'extension.log',
            encoding: 'utf8',
        }, options);

        assertType(!String.isEmpty(parsed.folder), `Log folder should be a non-empty string: ${parsed.folder}`);
        assertType(!String.isEmpty(parsed.filename), `Log filename should be a non-empty string: ${parsed.filename}`);

        // Sanitize filename
        parsed.filename = sanitize(parsed.filename);
        assert(parsed.filename.length, 'Log filename contained invalid characters only.');

        // Initialize properties
        Object.defineProperties(this, {

            /** 
             * Full path of the log file.
             * @type {String}
             */
            filepath: { value: path.join(parsed.folder, parsed.filename), enumerable: true },

            /**
             * Log file encoding.
             * @type {String}
             */
            encoding: { value: parsed.encoding, enumerable: true },

        });

        // Make sure the log folder exist
        window.cep.fs.makedir(parsed.folder);

        // Start a new log file
        fs.writeFileSync(this.filepath, 'Log file created on ' + new Date() + '\n', this.encoding);
    }

    /**
     * Initializes the log manager singleton.
     * @param {Object} options Options.
     * @param {String} options.folder Folder where the log file should be stored.
     * @param {String} [options.filename] Name of the log file.
     * @param {String} [options.encoding] Log file encoding.
     * @returns {LogManager}
     */
    static create(options)
    {
        assert(singleton === null, 'Log manager has already been initialized.');
        singleton = new LogManager(options);
        return singleton;
    }

    /**
     * Gets the log manager singleton.
     * @returns {LogManager}
     */
    static get()
    {
        assert(singleton !== null, 'Trying to access the Log manager before it has been initialized.');
        return singleton;
    }

    /**
     * @private
     * @param {String} text 
     */
    _write(text)
    {
        fs.appendFileSync(this.filepath, text, this.encoding);
    }

}

////////////////////////////////////////////////////////////////////////////////////////////

/** Gets a log-friendly time string. */
function getLogDate()
{
    const date = new Date();

    return util.format('%s:%s:%s.%s',
        ('00' + date.getHours()).slice(-2),
        ('00' + date.getMinutes()).slice(-2),
        ('00' + date.getSeconds()).slice(-2),
        ('000' + date.getMilliseconds()).slice(-3)
    );
}

/** Creates the log functions in the specified context. */
function createLogFunctions(context)
{
    const levels = {
        'debug': LogLevels.DEBUG,
        'error': LogLevels.ERROR,
        'warn': LogLevels.WARNING,
        'info': LogLevels.INFO,
    };

    for (let name in levels)
    {
        if (RELEASE)
        {
            context[name] = (function ()
            {
                const logName = name,
                    logLevel = levels[logName];

                return function ()
                {
                    if (logLevel.priority <= context.level.priority)
                    {
                        const args = Array.prototype.slice.call(arguments);
                        args[0] = args[0].replace(/%o/g, '%j');

                        const text = util.format('%s [%s] [%s] %s \r\n', getLogDate(), context.category, logName.toUpperCase(), util.format.apply(context, args));
                        LogManager.get()._write(text);
                    }
                }

            })();
        }
        else
        {
            // Log to console when in debug mode
            if (levels[name].priority <= context.level.priority)
            {
                context[name] = Function.prototype.bind.call(window.console[name], window.console, '%c[%s] %c[%s] %c%s', context.css, context.category, levels[name].css, name.toUpperCase(), 'color:#000');
            }
            else
            {
                context[name] = function () { };
            }
        }
    }

    // Aliases
    context.warning = context.warn;
    context.log = context.info;
}

/**
 * Logger.
 */
export default class Logger
{
    /**
     * Constructor
     * @param {String} category Log name.
     * @param {String} level Default log level.
     * @param {String} css Formatting style (only applied when logging to console.)
     */
    constructor(category, level, css)
    {
        assertType(!String.isEmpty(category), 'Log category needs to be a non-empty string.');
        level || (level = LogLevels.DEBUG);
        css || (css = 'color:#000');

        // Initialize properties
        Object.defineProperties(this, {

            category: { value: category, enumerable: true },

            css: { value: css, enumerable: true }, // Only used with console output

            _level: { value: level },

        });

        // Create log functions
        createLogFunctions(this);
    }

    /**
     * Gets the current log level.
     * @returns {String}
     */
    get level()
    {
        return this._level;
    }

    /**
     * Sets the current log level.
     * @param {String} newLevel
     */
    set level(newLevel)
    {
        if (this._level != newLevel)
        {
            this._level = newLevel;

            if (!RELEASE)
            {
                // To support line numbers when using console.log we need to
                // regenerate the console functions each time the log level changes
                createLogFunctions(this);
            }
        }
    }

}
