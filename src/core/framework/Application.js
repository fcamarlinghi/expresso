
'use strict';

const LogManager = require('./Log.js').LogManager,
      Theme = require('./Theme.js'),
      CEP = require('./CEP'),
      FileSystem = require('./FileSystem.js'),
      Settings = require('./Settings.js'),
      Photoshop = require('../photoshop/Photoshop.js'),
      ImageExporter = require('../exporter/ImageExporter.js'),

      Promise = require('bluebird'),
      path = require('path'),
      sanitize = require('sanitize-filename');

/** Gets log directory path. */
function getLogDirectory(info)
{
    if (process.platform === 'darwin')
    {
        return path.join(process.env.HOME || '', 'Library', 'Logs', info.vendor, info.name);
    }
    else if (process.platform === 'win32')
    {
        return path.join(process.env.APPDATA || '', info.vendor, info.name, 'logs');
    }
    else
    {
        return path.join(process.env.HOME || '', info.vendor, info.name, 'logs');
    }
};

/** Gets data directory path. */
function getDataDirectory(info)
{
    if (process.platform === 'darwin')
    {
        return path.join(process.env.APPDATA || '', 'Library', 'Application Support', info.vendor, info.name);
    }
    else if (process.platform === 'win32')
    {
        return path.join(process.env.APPDATA || '', info.vendor, info.name);
    }
    else
    {
        return path.join(process.env.HOME || '', info.vendor, info.name);
    }
};

// Application singleton
var application = Object.create(null),
    created = false;

/**
 * Creates an application singleton.
 * @param {String} name Application name.
 * @param {String} vendor Application vendor.
 * @param {String} version Application version.
 * @param {Object} [options={}] Initialization options.
 * @return {Promise.<Application>} A promise that resolves to the initialized application.
 */
application.create = function create(name, vendor, version, options)
{
    return new Promise(function (resolve, reject)
    {
        if (created)
        {
            reject('Only one application instance at a time is allowed.');
        }

        const parsed = options || {};

        // Validate parameters
        if (typeof name !== 'string' || name.length === 0)
        {
            reject('Invalid application name: ' + name);
        }

        if (typeof vendor !== 'string' || vendor.length === 0)
        {
            reject('Invalid application vendor: ' + vendor);
        }

        if (typeof version !== 'string' || version.length === 0)
        {
            reject('Invalid application version: ' + version);
        }

        // Check that vendor and application names are valid for folders
        if (sanitize(vendor + name).length === 0)
        {
            reject('Application vendor and name can\'t be used as folder names: ' + sanitize(vendor + name));
        }

        // We can now start to initialize properties...
        Object.defineProperty(application, 'extend', { value: function (properties) { Object.defineProperties(application, properties); }, enumerable: true });
        Object.defineProperty(application, 'info', { value: Object.freeze({ vendor: vendor, name: name, version: version }), enumerable: true });
        Object.defineProperty(application, 'folders', { value: Object.freeze({ data: getDataDirectory(application.info), logs: getLogDirectory(application.info) }), enumerable: true });

        // Make sure folders exist
        window.cep.fs.makedir(application.folders.data);
        window.cep.fs.makedir(application.folders.logs);

        // Order matters! Start with the logger...
        Object.defineProperty(application, 'logManager', { value: new LogManager(application, parsed.logManager), enumerable: true });
        Object.defineProperty(application, 'logger', { value: application.logManager.createLogger('Application'), enumerable: true });

        Object.defineProperty(application, 'settings', { value: new Settings(application, parsed.settings), enumerable: true });
        Object.defineProperty(application, 'cep', { value: new CEP(application), enumerable: true });
        Object.defineProperty(application, 'theme', { value: new Theme(application), enumerable: true });
        Object.defineProperty(application, 'fs', { value: new FileSystem(application), enumerable: true });
        Object.defineProperty(application, 'extension', { value: Object.freeze(application.cep.getExtensionInfo()), enumerable: true });

        application.cep.on('unload', function ()
        {
            application.logger.log('Shutting down...');
        });

        // Photoshop Host
        Object.defineProperty(application, 'photoshop', { value: new Photoshop(application), enumerable: true });
        Object.defineProperty(application, 'imageExporter', { value: new ImageExporter(application), enumerable: true });

        application.cep.on('unload', function ()
        {
            try { application.photoshop.disconnect(); } catch (e) { }
        });

        created = true;
        resolve(application.photoshop.connect());

    }).then(function ()
    {
        application.logger.log('Application', vendor, name, version, 'initialized.');
        application.create = undefined;
        return application;

    }).catch(function (e)
    {
        // If we're here a major exception has occurred, make sure it gets noticed
        if (application.logger)
        {
            application.logger.error('Could not initialize application: %o', e);
        }
        else
        {
            alert(e);
        }

        throw e;
    });
};

module.exports = application;
