
/**
 * Entry point for Expresso core functionality, including:
 *
 * - Main application singleton.
 * - Application framework: CEP wrapper, logger, settings and theme managers.
 * - Core UI widgets.
 * - Photoshop client.
 */

'use strict';

// Main stylesheet
require('./ui/css/core.less');

// Extensions
require('./extensions.js');

// Ractive setup
var Ractive = require('ractive');
Ractive.DEBUG = !RELEASE;

// Components, decorators, events
Ractive.components['core-panel'] = require('./ui/core-panel/core-panel.js');
Ractive.components['core-base'] = require('./ui/core-base/core-base.js');
Ractive.components['core-button'] = require('./ui/core-button/core-button.js');
Ractive.components['core-checkbox'] = require('./ui/core-checkbox/core-checkbox.js');
Ractive.components['core-colorbox'] = require('./ui/core-colorbox/core-colorbox.js');
Ractive.components['core-combobox'] = require('./ui/core-combobox/core-combobox.js');
Ractive.components['core-container'] = require('./ui/core-container/core-container.js');
Ractive.components['core-document'] = require('./ui/core-document/core-document.js');
Ractive.components['core-dropdown'] = require('./ui/core-dropdown/core-dropdown.js');
Ractive.components['core-field'] = require('./ui/core-field/core-field.js');
Ractive.components['core-icon'] = require('./ui/core-icon/core-icon.js');
Ractive.components['core-icon-button'] = require('./ui/core-icon-button/core-icon-button.js');
Ractive.components['core-label'] = require('./ui/core-label/core-label.js');
Ractive.components['core-menu'] = require('./ui/core-menu/core-menu.js');
Ractive.components['core-menu-button'] = require('./ui/core-menu-button/core-menu-button.js');
Ractive.components['core-menu-item'] = require('./ui/core-menu-item/core-menu-item.js');
Ractive.components['core-menu-separator'] = require('./ui/core-menu-separator/core-menu-separator.js');
Ractive.components['core-numberbox'] = require('./ui/core-numberbox/core-numberbox.js');
Ractive.components['core-slider'] = require('./ui/core-slider/core-slider.js');
Ractive.components['core-textbox'] = require('./ui/core-textbox/core-textbox.js');
Ractive.components['core-throbber'] = require('./ui/core-throbber/core-throbber.js');
Ractive.components['core-toolbar'] = require('./ui/core-toolbar/core-toolbar.js');

Ractive.decorators['core-tooltip'] = require('./ui/core-tooltip/core-tooltip.js');
Ractive.decorators['core-visible'] = require('./ui/core-visible/core-visible.js');

Ractive.events['tap'] = require('ractive-events-tap');

module.exports = {

    application: require('./framework/Application.js'),

};
