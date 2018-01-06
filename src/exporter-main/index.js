
/**
 * 
 * Main Exporter Panel entry point.
 * 
 */

import 'core';
import Extension from 'core/Extension.js';
import PhotoshopInterface from 'photoshop/PhotoshopInterface.js';
import ImageExporter from 'photoshop/ImageExporter.js';

import ExporterDefaultSettings from './DefaultSettings.json';
import ExporterPanel from './exporter-panel/exporter-panel.js';

const extension = Extension.create({
    name: 'Exporter',
    vendor: 'Expresso',
    version: VERSION,
    folder: 'Expresso/Exporter',
    log: { filename: 'exporter-main.log' },
    settings: {
        defaults: ExporterDefaultSettings,
    },
});

// Create the photoshop interfaces
Object.defineProperty(extension, 'photoshop', { value: new PhotoshopInterface(), enumerable: true });
Object.defineProperty(extension, 'imageExporter', { value: new ImageExporter(extension.photoshop), enumerable: true });
extension.on('unload', () => { try { extension.photoshop.disconnect(); } catch (e) { } });

// Create the UI
Object.defineProperty(extension, 'ui', { value: new ExporterPanel(), enumerable: true });
