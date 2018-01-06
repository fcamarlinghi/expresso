
import extend from 'extend';
import nodePath from 'path';
import Ractive from 'ractive';
import sanitize from 'sanitize-filename';
import Logger from './Logger.js';
import CEP from './CEP.js';
import { assert, assertType } from './assert.js';

export const SETTINGS_UPDATED_EVENT = 'com.expresso.settingsUpdated';

/**
 * Manages settings.
 */
export default class Settings
{
    /**
     * Constructor.
     * @param {Object} options Options.
     * @param {String} options.folder Folder where the settings file should be stored.
     * @param {String} [options.filename] Name of the file where settings will be stored.
     * @param {Boolean} [options.autoSave] Whether the settings file will be autosaved each time settings are modified.
     * @param {Object} [options.defaults] Default values.
     */
    constructor(options)
    {
        const parsed = extend({
            folder: null,
            filename: 'settings.json',
            autoSave: true,
            defaults: {},
        }, options);

        assertType(!String.isEmpty(parsed.folder), `Settings folder should be a non-empty string: ${parsed.folder}`);
        assertType(!String.isEmpty(parsed.filename), `Settings filename should be a non-empty string: ${parsed.filename}`);

        // Sanitize filename
        parsed.filename = sanitize(parsed.filename);
        assert(parsed.filename.length, 'Log filename contained invalid characters only.');

        // Define properties
        Object.defineProperties(this, {

            logger: { value: new Logger('Settings'), enumerable: true },

            filepath: { value: nodePath.join(parsed.folder, parsed.filename), enumerable: true },

            autoSave: { value: parsed.autoSave, writable: true, enumerable: true },

            defaults: { value: parsed.defaults, enumerable: true },

            _ractive: { value: null, writable: true },

        });

        // Make sure the data folder exist
        window.cep.fs.makedir(parsed.folder);

        // Listen to updates to settings performed by other extensions
        CEP.addEventListener(SETTINGS_UPDATED_EVENT, (event) =>
        {
            if (event
                && event.data
                && event.data.filepath === this.filepath
                && event.data.settings
                && this._ractive)
            {
                // Apply updated settings
                this._ractive.set('settings', event.data.settings);
            }
        });
    }

    /** Gets a setting. */
    get(path)
    {
        if (!this._ractive)
        {
            throw new Error('Trying to get a value before loading settings.');
        }

        return this._ractive.get('settings.' + path);
    }

    /** Gets all the settings. */
    all()
    {
        if (!this._ractive)
        {
            throw new Error('Trying to get all values before loading settings.');
        }

        const values = this._ractive.get('settings');

        if (values === undefined)
        {
            return {};
        }
        else
        {
            return extend(true, {}, values);
        }
    }

    /** Sets a setting. */
    set(path, value)
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
    }

    /** Toggles a setting. */
    toggle(path)
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
    }

    /** Observes a settings. */
    observe(path, callback)
    {
        return this._ractive.observe('settings.' + path, callback, { init: false });
    }

    /** Observes a settings, once. */
    observeOnce(path, callback)
    {
        return this._ractive.observeOnce('settings.' + path, callback);
    }

    /** Loads settings. */
    load()
    {
        this.logger.info('Loading settings from', this.filepath);

        let result = window.cep.fs.readFile(this.filepath),
            settings = {};

        if (result.err === window.cep.fs.NO_ERROR)
        {
            try
            {
                settings = JSON.parse(result.data);
            }
            catch (e)
            {
                this.logger.warn('Error parsing settings from JSON, starting clean.');
            }
        }
        else
        {
            this.logger.warn('Error reading settings file, starting clean.');
        }

        if (this._ractive)
        {
            this._ractive.teardown();
            this._ractive = null;
        }

        this._ractive = new Ractive({

            data: {
                settings: extend(true, {}, this.defaults, settings),
            },

        });
    }

    /** Saves settings. */
    save()
    {
        this.logger.info('Saving settings to', this.filepath);

        if (this._ractive)
        {
            try
            {
                const settings = this._ractive.get('settings');
                window.cep.fs.writeFile(this.filepath, JSON.stringify(settings), undefined, 4);
                CEP.dispatchEvent(SETTINGS_UPDATED_EVENT, { filepath: this.filepath, settings });
                return true;
            }
            catch (e)
            {
                this.logger.error('Error while saving settings %o', e);
            }
        }

        return false;
    }

}
