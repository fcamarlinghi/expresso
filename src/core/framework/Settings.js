
import extend from 'extend';
import nodePath from 'path';
import Ractive from 'ractive';

/**
 * Manages settings.
 */
export default class Settings
{
    constructor(application, options)
    {
        const parsed = extend({
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
    load(defaults)
    {
        const filepath = nodePath.join(this.application.folders.data, this.filename);

        this.application.logger.info('Loading settings from', filepath);

        let result = window.cep.fs.readFile(filepath),
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
    }

    /** Saves settings. */
    save()
    {
        const filepath = nodePath.join(this.application.folders.data, this.filename);

        this.application.logger.info('Saving settings to', filepath);

        if (this._ractive)
        {
            try
            {
                window.cep.fs.writeFile(filepath, JSON.stringify(this._ractive.get('settings'), undefined, 4));
                return true;
            }
            catch (e)
            {
                this.application.logger.error('Error while saving settings %o', e);
            }
        }

        return false;
    }

}
