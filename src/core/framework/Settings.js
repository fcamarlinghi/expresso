
'use strict';

var extend = require('extend'),
    path = require('path'),
    Ractive = require('ractive');

/**
 * Manages settings.
 */
function Settings(application, options)
{
    var parsed = extend({
        filename: 'settings.json',
        autoSave: true,
    }, options);

    Object.defineProperties(this, {

        application: { value: application, enumerable: true },

        logger: { value: application.logManager.createLogger('Settings'), enumerable: true },

        filename: { value: parsed.filename, enumerable: true },

        autoSave: { value: parsed.autoSave, writable: true, enumerable: true },

        _ractive: { value: null, writable: true },

    });
};

// Prototype
Settings.prototype = Object.create(null);
Settings.constructor = Settings;

/** Gets a setting. */
Settings.prototype.get = function get(path)
{
    if (!this._ractive)
    {
        throw new Error('Trying to get a value before loading settings.');
    }

    return this._ractive.get('settings.' + path);
};

/** Gets all the settings. */
Settings.prototype.all = function all()
{
    if (!this._ractive)
    {
        throw new Error('Trying to get all values before loading settings.');
    }

    var values = this._ractive.get('settings');

    if (values === undefined)
    {
        return {};
    }
    else
    {
        return extend(true, {}, values);
    }
};

/** Sets a setting. */
Settings.prototype.set = function set(path, value)
{
    if (!this._ractive)
    {
        throw new Error('Trying to set a value before loading settings.');
    }

    this._ractive.set('settings.' + path, value);

    if (this.autoSave)
    {
        return this.save();
    }

    return true;
};

/** Toggles a setting. */
Settings.prototype.toggle = function toggle(path)
{
    if (!this._ractive)
    {
        throw new Error('Trying to toggle a value before loading settings.');
    }

    this._ractive.toggle('settings.' + path);

    if (this.autoSave)
    {
        return this.save();
    }

    return true;
};

/** Observes a settings. */
Settings.prototype.observe = function observe(path, callback)
{
    return this._ractive.observe('settings.' + path, callback, { init: false });
};

/** Observes a settings, once. */
Settings.prototype.observeOnce = function observeOnce(path, callback)
{
    return this._ractive.observeOnce('settings.' + path, callback);
};

/** Loads settings. */
Settings.prototype.load = function load(defaults)
{
    var filepath = path.join(this.application.folders.data, this.filename);

    this.application.logger.info('Loading settings from', filepath);

    var result = window.cep.fs.readFile(filepath),
        settings = {};

    if (result.err === window.cep.fs.NO_ERROR)
    {
        try
        {
            settings = JSON.parse(result.data);
        }
        catch (e)
        {
            this.application.logger.warn('Error parsing settings from JSON, starting clean.');
        }
    }
    else
    {
        this.application.logger.warn('Error reading settings file, starting clean.');
    }

    if (this._ractive)
    {
        this._ractive.teardown();
        this._ractive = null;
    }

    this._ractive = new Ractive({

        data: {
            settings: extend(true, {}, defaults, settings),
        },

    });
};

/** Saves settings. */
Settings.prototype.save = function save()
{
    var filepath = path.join(this.application.folders.data, this.filename),
        result = false;

    this.application.logger.info('Saving settings to', filepath);

    if (this._ractive)
    {
        try
        {
            window.cep.fs.writeFile(filepath, JSON.stringify(this._ractive.get('settings'), undefined, 4));
            result = true;
        }
        catch (e)
        {
            this.application.logger.error('Error while saving settings %o', e);
        }
    }

    return result;
};

module.exports = Settings;
