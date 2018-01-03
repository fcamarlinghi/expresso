
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

// Export the application module
import application from './framework/Application.js';
export { application };
