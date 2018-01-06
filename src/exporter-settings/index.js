
/**
 * 
 * Main Exporter Settings entry point.
 * 
 */

import 'core';
import Extension from 'core/Extension.js';
import ExporterDefaultSettings from '../exporter-main/DefaultSettings.json';
import SettingsPanel from './settings-panel/settings-panel.js';

const extension = Extension.create({
    name: 'Exporter Settings',
    vendor: 'Expresso',
    version: VERSION,
    folder: 'Expresso/Exporter',
    log: { filename: 'exporter-settings.log' },
    settings: {
        defaults: ExporterDefaultSettings,
    },
});

// Create the UI
Object.defineProperty(extension, 'ui', { value: new SettingsPanel(), enumerable: true });
