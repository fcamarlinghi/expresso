
'use strict';

/**
 * Defines export settings for a single output image.
 */
function ExportTarget()
{
    Object.defineProperties(this, {

        /** Export path. Only used when exporting to file. */
        path: { value: '', enumerable: true, writable: true },

        /** Export format (@see ImageExporter.FORMATS). */
        format: { value: 'tga', enumerable: true, writable: true },

        /** LayerID <-> channel map. Specifies which layer should be saved into each channel of the output image (RGBA). */
        channels: { value: [-1, -1, -1, -1], enumerable: true, writable: false },

        /** Whether RGB channels should be locked together (that is, the layer specified for the RED channel will be used for GREEN and BLUE as-well). */
        channelsLocked: { value: true, enumerable: true, writable: true },

        /** Export scale (1.0 means no scaling). */
        scale: { value: 1.0, enumerable: true, writable: true },

        /** Export filters. */
        filters: {
            value: Object.create(null, {
                blur: { value: false, enumerable: true, writable: true },
                sharpen: { value: false, enumerable: true, writable: true },
                invert: { value: false, enumerable: true, writable: true },
            }),
            enumerable: true,
            writable: false,
        },

        /** Special filters that only apply to normal maps. */
        normal: {
            value: Object.create(null, {
                normalize: { value: false, enumerable: true, writable: true },
                flipX: { value: false, enumerable: true, writable: true },
                flipY: { value: false, enumerable: true, writable: true },
                flipZ: { value: false, enumerable: true, writable: true },
            }),
            enumerable: true,
            writable: false,
        },

    });
};

ExportTarget.prototype = Object.create(null);
ExportTarget.constructor = ExportTarget;

module.exports = ExportTarget;
