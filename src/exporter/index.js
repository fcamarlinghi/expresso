
'use strict';

/**
 * 
 * Exporter Panel entry point.
 * 
 */

// Create the Exporter application and panel
var Core = require('core'),
    ExporterPanel = require('./exporter-panel/exporter-panel.js');

Core.application.create('Exporter', 'Expresso', VERSION).then(function (application)
{
    // Create the UI
    var ui = new ExporterPanel();
    application.extend({ ui: { get: function () { return ui; } } });
});

// Re-export the "core" module, so we can access its API
module.exports = Core;
