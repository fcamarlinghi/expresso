
'use strict';

var EventEmitter = require('events').EventEmitter;

var supportedThemes = ['dark', 'light', 'medium-dark', 'medium-light'];

/**
 * Utility class that helps managing themes.
 */
function Theme(application)
{
    EventEmitter.call(this);

    Object.defineProperties(this, {

        application: { value: application, enumerable: true },

        /** A list of styles for the current theme. */
        style: {
            value: {
                backgroundColor: '343434',
                baseFontFamily: 'Tahoma',
                baseFontSize: 10,
            },
            enumerable: true,
        },

    });

    // Setup theme changed event listener
    application.cep.addEventListener(CSInterface.THEME_COLOR_CHANGED_EVENT, this.updateTheme, this);

    // Immediately update theme
    this.updateTheme();
};

// Prototype
Theme.prototype = Object.create(EventEmitter.prototype);
Theme.constructor = Theme;

Object.defineProperties(Theme.prototype, {

    /** A list of supported color schemes. */
    supportedThemes: { get: function () { return supportedThemes.slice(0); }, enumerable: true },

    /** Name of the currently active theme. */
    activeTheme: { get: function () { return this._activeTheme; }, enumerable: true },

    /** Whether the current theme is a light one. */
    isActiveThemeLight: { get: function () { return (this._activeTheme === supportedThemes[0] || this._activeTheme === supportedThemes[3]); }, enumerable: true },

    /** The name of the default theme. */
    defaultTheme: { value: 'medium-dark', enumerable: true },

    // Private
    _activeTheme: { value: null, writable: true },

});

/** Updates the current theme to match the application one. */
Theme.prototype.updateTheme = function ()
{
    var theme,
        cep = this.application.cep,
        skinInfo = cep.getHostEnvironment().appSkinInfo,
        panelBackgroundColor = skinInfo.panelBackgroundColor.color.red;

    // NOTE: starting from Photoshop CC 2015.1 (version 16.1) dark and light
    // theme colors were made respectively darker and lighter
    if (panelBackgroundColor == 52 || panelBackgroundColor == 50) //0x343434 || 0x323232
    {
        // Dark
        theme = 'dark';
        this.style.backgroundColor = (panelBackgroundColor == 52) ? '#343434' : '#323232';
    }
    else if (panelBackgroundColor == 214 || panelBackgroundColor == 240) //0xd6d6d6 || 0xf0f0f0
    {
        // Light
        theme = 'light';
        this.style.backgroundColor = (panelBackgroundColor == 214) ? '#d6d6d6' : '#f0f0f0';
    }
    else if (panelBackgroundColor == 184) //0xb8b8b8
    {
        // Medium-light
        theme = 'medium-light';
        this.style.backgroundColor = '#b8b8b8';
    }
    else // Fallback to Medium-dark 0x535353 or 83
    {
        theme = 'medium-dark';
        this.style.backgroundColor = '#535353';
    }

    this.style.baseFontFamily = skinInfo.baseFontFamily;
    this.style.baseFontSize = skinInfo.baseFontSize;

    // Set html class
    if (typeof this._activeTheme == 'string' && this._activeTheme.length)
        document.documentElement.classList.remove(this._activeTheme)

    document.documentElement.classList.add(theme);

    // Save active theme
    this._activeTheme = theme;

    // Trigger 'change' event
    this.emit('change', theme, this.style);
};

module.exports = Theme;
