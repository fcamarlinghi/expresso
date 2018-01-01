
/**
 * Entry point for Expresso core functionality, including:
 *
 * - Main application singleton.
 * - Application framework: CEP wrapper, logger, settings and theme managers.
 * - Core UI widgets.
 * - Photoshop client.
 */

// Main stylesheet
import './ui/css/core.less';

// Extensions
import './extensions.js';

// Ractive setup
import Ractive from 'ractive';
Ractive.DEBUG = !RELEASE;

// Components, decorators, events
import CorePanel from './ui/core-panel/core-panel.js';
import CoreButton from './ui/core-button/core-button.js';
import CoreCheckbox from './ui/core-checkbox/core-checkbox.js';
import CoreColorbox from './ui/core-colorbox/core-colorbox.js';
import CoreCombobox from './ui/core-combobox/core-combobox.js';
import CoreContainer from './ui/core-container/core-container.js';
import CoreDocument from './ui/core-document/core-document.js';
import CoreDropdown from './ui/core-dropdown/core-dropdown.js';
import CoreIcon from './ui/core-icon/core-icon.js';
import CoreIconButton from './ui/core-icon-button/core-icon-button.js';
import CoreLabel from './ui/core-label/core-label.js';
import CoreMenu from './ui/core-menu/core-menu.js';
import CoreMenuButton from './ui/core-menu-button/core-menu-button.js';
import CoreMenuItem from './ui/core-menu-item/core-menu-item.js';
import CoreMenuSeparator from './ui/core-menu-separator/core-menu-separator.js';
import CoreNumberbox from './ui/core-numberbox/core-numberbox.js';
import CoreSlider from './ui/core-slider/core-slider.js';
import CoreTextbox from './ui/core-textbox/core-textbox.js';
import CoreThrobber from './ui/core-throbber/core-throbber.js';
import CoreToolbar from './ui/core-toolbar/core-toolbar.js';

import CoreTooltip from './ui/core-tooltip/core-tooltip.js';
import CoreVisible from './ui/core-visible/core-visible.js';

import RactiveTap from 'ractive-events-tap';

Ractive.components['core-panel'] = CorePanel;
Ractive.components['core-button'] = CoreButton;
Ractive.components['core-checkbox'] = CoreCheckbox;
Ractive.components['core-colorbox'] = CoreColorbox;
Ractive.components['core-combobox'] = CoreCombobox;
Ractive.components['core-container'] = CoreContainer;
Ractive.components['core-document'] = CoreDocument;
Ractive.components['core-dropdown'] = CoreDropdown;
Ractive.components['core-icon'] = CoreIcon;
Ractive.components['core-icon-button'] = CoreIconButton;
Ractive.components['core-label'] = CoreLabel;
Ractive.components['core-menu'] = CoreMenu;
Ractive.components['core-menu-button'] = CoreMenuButton;
Ractive.components['core-menu-item'] = CoreMenuItem;
Ractive.components['core-menu-separator'] = CoreMenuSeparator;
Ractive.components['core-numberbox'] = CoreNumberbox;
Ractive.components['core-slider'] = CoreSlider;
Ractive.components['core-textbox'] = CoreTextbox;
Ractive.components['core-throbber'] = CoreThrobber;
Ractive.components['core-toolbar'] = CoreToolbar;

Ractive.decorators['core-tooltip'] = CoreTooltip;
Ractive.decorators['core-visible'] = CoreVisible;

Ractive.events['tap'] = RactiveTap;

//Ractive.components['core-panel'] = require('./ui/core-panel/core-panel.js');
//Ractive.components['core-base'] = require('./ui/core-base/core-base.js');
//Ractive.components['core-button'] = require('./ui/core-button/core-button.js');
//Ractive.components['core-checkbox'] = require('./ui/core-checkbox/core-checkbox.js');
//Ractive.components['core-colorbox'] = require('./ui/core-colorbox/core-colorbox.js');
//Ractive.components['core-combobox'] = require('./ui/core-combobox/core-combobox.js');
//Ractive.components['core-container'] = require('./ui/core-container/core-container.js');
//Ractive.components['core-document'] = require('./ui/core-document/core-document.js');
//Ractive.components['core-dropdown'] = require('./ui/core-dropdown/core-dropdown.js');
//Ractive.components['core-field'] = require('./ui/core-field/core-field.js');
//Ractive.components['core-icon'] = require('./ui/core-icon/core-icon.js');
//Ractive.components['core-icon-button'] = require('./ui/core-icon-button/core-icon-button.js');
//Ractive.components['core-label'] = require('./ui/core-label/core-label.js');
//Ractive.components['core-menu'] = require('./ui/core-menu/core-menu.js');
//Ractive.components['core-menu-button'] = require('./ui/core-menu-button/core-menu-button.js');
//Ractive.components['core-menu-item'] = require('./ui/core-menu-item/core-menu-item.js');
//Ractive.components['core-menu-separator'] = require('./ui/core-menu-separator/core-menu-separator.js');
//Ractive.components['core-numberbox'] = require('./ui/core-numberbox/core-numberbox.js');
//Ractive.components['core-slider'] = require('./ui/core-slider/core-slider.js');
//Ractive.components['core-textbox'] = require('./ui/core-textbox/core-textbox.js');
//Ractive.components['core-throbber'] = require('./ui/core-throbber/core-throbber.js');
//Ractive.components['core-toolbar'] = require('./ui/core-toolbar/core-toolbar.js');

//Ractive.decorators['core-tooltip'] = require('./ui/core-tooltip/core-tooltip.js');
//Ractive.decorators['core-visible'] = require('./ui/core-visible/core-visible.js');

//Ractive.events['tap'] = require('ractive-events-tap');

// Export the application module
import application from './framework/Application.js';
export { application };
