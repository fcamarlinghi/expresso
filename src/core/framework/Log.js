
'use strict';

var path = require('path'),
    util = require('util'),
    fs = require('fs'),
    extend = require('extend'),
    sanitize = require('sanitize-filename');

/** Converts the passed Date into a log-friendly time string. */
function dateToString(date)
{
    function padString(s, places)
    {
        var i = places - s.length;

        while (i > 0)
        {
            s = '0' + s;
            i--;
        }

        return s;
    }

    return util.format('%s:%s:%s.%s',
        padString(String(date.getHours()), 2),
        padString(String(date.getMinutes()), 2),
        padString(String(date.getSeconds()), 2),
        padString(String(date.getMilliseconds()), 3)
    );
};

/** Creates the log functions in the specified context. */
function createLogFunctions(context)
{
    var levels = {
        'debug': LogLevels.DEBUG,
        'error': LogLevels.ERROR,
        'warn': LogLevels.WARNING,
        'info': LogLevels.INFO,
    };

    for (var name in levels)
    {
        if (RELEASE)
        {
            context[name] = (function ()
            {
                var logName = name;
                var logLevel = levels[logName];

                return function ()
                {
                    if (logLevel.priority <= context.logLevel.priority)
                    {
                        var args = Array.prototype.slice.call(arguments);
                        args[0] = args[0].replace(/%o/g, '%j');

                        var text = util.format('%s [%s] [%s] %s \r\n', dateToString(new Date()), context.category, logName.toUpperCase(), util.format.apply(context, args));
                        context.logManager._write(text);
                    }
                }

            })();
        }
        else
        {
            // Log to console when in debug mode
            if (levels[name].priority <= context.logLevel.priority)
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
};

/**
 * Log levels.
 */
var LogLevels = Object.create(null, {

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

});

/**
 * Log manager.
 */
function LogManager(application, options)
{
    var parsed = extend({
        filename: 'application.log',
        encoding: 'utf8',
    }, options);

    if (typeof parsed.filename !== 'string' || !parsed.filename.length)
    {
        throw new Error('Invalid log filename: ' + parsed.filename);
    }

    // Check that we have a valid log filename
    if (!sanitize(parsed.filename).length)
    {
        throw new Error('Invalid log filename: ' + parsed.filename);
    }

    // Initialize properties
    Object.defineProperties(this, {

        application: { value: application, enumerable: true },

        filename: { value: path.join(application.folders.logs, sanitize(parsed.filename)), enumerable: true },

        encoding: { value: parsed.encoding, enumerable: true },

    });

    // Start new log file
    fs.writeFileSync(this.filename, 'Log file created on ' + new Date() + '\n', this.encoding);
};

LogManager.prototype = Object.create(null);
LogManager.constructor = LogManager;

LogManager.prototype.createLogger = function createLogger(name, logLevel, css)
{
    return new Logger(this, { category: name, logLevel: logLevel, css: css });
};

LogManager.prototype._write = function _write(text)
{
    fs.appendFileSync(this.filename, text, this.encoding);
};

/**
 * Logger.
 */
function Logger(logManager, options)
{
    var parsed = extend({
        category: null,
        css: 'color:#000',
        logLevel: RELEASE ? LogLevels.INFO : LogLevels.DEBUG,
    }, options);

    if (typeof parsed.category !== 'string' || !parsed.category.length)
        throw new Error('Invalid log category: ' + parsed.category);

    // Initialize properties
    var _logLevel = parsed.logLevel;

    Object.defineProperties(this, {

        logManager: { value: logManager, enumerable: true },

        category: { value: parsed.category, enumerable: true },

        css: { value: parsed.css, enumerable: true }, // Only used with console output

        logLevel: {

            get: function ()
            {
                return _logLevel;
            },

            set: function (logLevel)
            {
                if (logLevel != _logLevel)
                {
                    _logLevel = logLevel;

                    if (!RELEASE)
                    {
                        // To support line numbers when using console.log we need to
                        // regenerate the console functions each time the log level changes
                        createLogFunctions(this);
                    }
                }
            },

            enumerable: true,

        },

    });

    // Create log functions
    createLogFunctions(this);
};

Logger.prototype = Object.create(null);
Logger.constructor = Logger;

module.exports = {

    LogManager: LogManager,
    LogLevels: LogLevels,

};
