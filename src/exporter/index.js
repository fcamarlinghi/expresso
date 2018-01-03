
/**
 * 
 * Exporter Panel entry point.
 * 
 */

// Create the Exporter application and panel
import * as Core from 'core';
import ExporterPanel from './exporter-panel/exporter-panel.js';

Core.application.create('Exporter', 'Expresso', VERSION).then(function (application)
{
    // Create the UI
    const ui = new ExporterPanel();
    application.extend({ ui: { get: function () { return ui; } } });
});

// Re-export the "core" module, so we can access its API
export default Core;
