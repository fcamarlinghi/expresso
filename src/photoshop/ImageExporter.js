
import { spawn } from 'child_process';
import fs from 'fs';
import Logger from 'core/Logger.js';
import ExportTarget from './ExportTarget.js';

// Utilities
/** Searches for the layer with the specified ID in a layer tree. */
function _findLayerById(id, layers)
{
    for (let i = 0; i < layers.length; i++)
    {
        if (layers[i].id === id)
        {
            return layers[i];
        }
        else if (layers[i].layers && layers[i].layers.length)
        {
            const subsearch = _findLayerById(id, layers[i].layers);
            if (subsearch !== null)
            {
                return subsearch;
            }
        }
    }

    return null;
}

/** Fills a channel of a pixel buffer with a color. */
function _fillPixels(buffer, offset, color)
{
    for (let i = offset; i < buffer.length; i = i + 4)
    {
        buffer[i] = color;
    }
}

/** Copies a channel from an input pixel buffer to an output pixel buffer. */
function _copyPixels(input, output, inputOffset, outputOffset)
{
    if (inputOffset === outputOffset)
    {
        for (let i = inputOffset; i < output.length; i = i + 4)
        {
            output[i] = input[i];
        }
    }
    else
    {
        for (let i = 0; i < output.length; i = i + 4)
        {
            output[i + outputOffset] = input[i + inputOffset];
        }
    }
}

/** Logger. */
const logger = new Logger('ImageExporter');

/** Supported export formats. */
export const FORMATS = Object.freeze({

    /** Raw pixels, used to export to memory (i.e. when loading a layer into the previewer). */
    RAW: 'raw',

    TGA: 'tga',
    PNG: 'png',
    JPG: 'jpg',
    TIFF: 'tiff',
    PSD: 'psd',

});

/**
 * Image exporter.
 */
export default class ImageExporter
{

    /**
     * Constructor.
     * @param {PhotoshopInterface} photoshop The Photoshop interface to use.
     */
    constructor(photoshop)
    {
        Object.defineProperties(this, {

            photoshop: { value: photoshop, enumerable: true },

        });
    }

    /** Utility factory method for a ExportTarget. */
    createTarget()
    {
        return new ExportTarget();
    }

    /**
     * Exports the specified targets out of Photoshop.
     * @param {ExportTarget[]} targets Targets to export.
     * @param {ExportOptions[]} options Export options.
     * @return {Promise} A promise that is fullfilled once all the targets have been exported.
     */
    run(targets, options)
    {
        const startTime = performance.now();

        const documentInfo = {
            id: -1,
            file: '',
            width: 0,
            height: 0,
            depth: 8,
        };

        const layers = {},
            pixmaps = {},
            outputs = [];

        let pixmapBufferSize = 0;

        return Promise.try(() =>
        {
            // 1 - Base validation
            if (!Array.isArray(targets) || targets.length === 0)
            {
                // Silently fail
                throw new Error('No export targets specified, nothing to export.');
            }

        }).then(() =>
        {
            // 2 - Get document info
            return this.photoshop.getDocumentInfo(null, {
                compInfo: false,
                imageInfo: true,
                layerInfo: true,
                expandSmartObjects: false,
                getTextStyles: false,
                getFullTextStyles: false,
                selectedLayers: false,
                getCompLayerSettings: false,
                getDefaultLayerFX: false
            });

        }).then((rawDocumentInfo) =>
        {
            documentInfo.id = rawDocumentInfo.id;
            documentInfo.file = rawDocumentInfo.file;
            documentInfo.width = rawDocumentInfo.bounds.right;
            documentInfo.height = rawDocumentInfo.bounds.bottom;
            // NOTE: for the moment always assume 8-bit depth as Pixmaps only support that
            //documentInfo.depth = rawDocumentInfo.depth;

            // We now have enough data to calculate the needed buffer size
            pixmapBufferSize = (documentInfo.width * documentInfo.height) * ((documentInfo.depth / 8) * 4);

            // 3 - Validate every target and setup outputs
            for (const target of targets)
            {
                if (target.channels[0] < 0
                    && target.channels[1] < 0
                    && target.channels[2] < 0
                    && target.channels[3] < 0)
                {
                    // No layers were selected for this target, notify user
                    throw new Error(`No layers were selected for target "${target.path}".`);
                }

                // Check that every channel of this target points to a valid layer
                for (const channel of target.channels)
                {
                    if (channel > -1 && !layers.hasOwnProperty(channel))
                    {
                        const layer = _findLayerById(channel, rawDocumentInfo.layers);

                        if (layer === null)
                        {
                            // Layer could not be found
                            // Severe error, might mean that data is corrupt or not in sync with document
                            throw new Error(`Layer with ID "${channel}" could not be found in document.`);
                        }
                        else
                        {
                            if (layer.type !== 'layerSection')
                            {
                                // The selected layer is not a group!
                                // Severe error, might mean that data is corrupt or not in sync with document
                                throw new Error(`Layer "${layer.name}" is not a group.`);
                            }

                            if (!Array.isArray(layer.layers)
                                || layer.layers.length === 0
                                || (layer.bounds.top === 0 && layer.bounds.right === 0 && layer.bounds.bottom === 0 && layer.bounds.left === 0))
                            {
                                // Group is empty or all layers inside are empty/invisible
                                throw new Error(`Layer group "${layer.name}" is empty, nothing could be exported.`);
                            }

                            // If we're here the layer is valid, cache the result
                            layers[layer.id] = layer;
                        }
                    }
                }

                // Make sure we always have valid parameters
                target.format || (target.format = FORMATS.TGA);
                target.scale || (target.scale = 1.0);

                if (target.channelsLocked === true)
                {
                    // Make sure RGB channels are the same if exporting with locked channels
                    target.channels[2] = target.channels[1] = target.channels[0];
                }
                else if (target.channels[2] === target.channels[1] && target.channels[1] === target.channels[0])
                {
                    // Likewise set the channelsLocked flag if all channels are the same
                    // so export code can take optimized paths
                    target.channelsLocked = true;
                }

                // Setup an output for this target which is now guarateed to be valid
                outputs.push({
                    documentInfo: documentInfo,
                    target: target,
                    pixels: null,
                    layers: Object.keys(layers).reduce((array, layerId) =>
                    {
                        if (target.channels.indexOf(layers) > -1)
                        {
                            array.push(layers[layerId]);
                        }

                        return array;
                    }, []),
                });
            }

        }).then(() =>
        {
            // 4 - For each channel in target, get a pixmap if we do not already have it
            // NOTE: Photoshop does not support acquiring pixmaps concurrently, so we
            // must wait until a pixmap has been acquired before requesting the next one
            return Promise.all(targets.map((target) =>
            {
                return Promise.all(target.channels.map((channel) =>
                {
                    if (channel > -1 && !pixmaps.hasOwnProperty(channel))
                    {
                        pixmaps[channel] = null;

                        return this.photoshop.getPixmap(documentInfo.id, channel, {
                            includeAncestorMasks: false,
                            includeAdjustors: false,
                            clipToDocumentBounds: true,
                            bounds: true,
                            maxDimension: 16384,
                        }).then((pixmap) =>
                        {
                            // Eventually apply some processing
                            let needsProcessing = false;

                            if (pixmap.height !== documentInfo.height || pixmap.width !== documentInfo.width)
                            {
                                // If the resulting pixmap is smaller than the document size then the exported layer
                                // didn't extend to document bounds. In this case padding should be applied to the
                                // pixmap so it ends up fitting correctly into the exported files
                                needsProcessing = true;
                            }
                            else
                            {
                                // If the pixmap contains transparent pixels we need to apply a matte color. We check for this now and
                                // avoid the useless (and expensive!) processing in case the pixmap is fully opaque
                                for (let i = 0; i < pixmap.pixels.length; i = i + 4)
                                {
                                    if (pixmap.pixels[i] < 255)
                                    {
                                        needsProcessing = true;
                                        break;
                                    }
                                }
                            }

                            if (needsProcessing)
                            {
                                const source = pixmap.pixels,
                                    sourceBounds = pixmap.bounds,
                                    sourceRowBytes = pixmap.rowBytes;

                                // Create a completely black buffer of document size
                                const target = new Buffer(pixmapBufferSize);
                                target.fill(0);

                                // Copy rows from source to target one by one
                                let targetIndex = ((sourceBounds.top * documentInfo.width) + sourceBounds.left) * 4,
                                    rowNum = source.length / sourceRowBytes;

                                for (let row = 0; row < rowNum; row++)
                                {
                                    let sourceIndex = row * sourceRowBytes,
                                        sourceRowEnd = sourceIndex + sourceRowBytes;

                                    for (; sourceIndex < sourceRowEnd; sourceIndex = sourceIndex + 4)
                                    {
                                        // Only copy non-clipped pixels
                                        const alpha = source[sourceIndex];

                                        if (alpha === 255)
                                        {
                                            // Fast copy, no interpolation needed
                                            source.copy(target, targetIndex + sourceIndex, sourceIndex, sourceIndex + 4);
                                        }
                                        else if (alpha > 0)
                                        {
                                            // Interpolate alpha
                                            const linearAlpha = alpha / 255,
                                                i = targetIndex + sourceIndex;

                                            target[i] = alpha;
                                            target[i + 1] = Math.lerp(target[i + 1], source[sourceIndex + 1], linearAlpha);
                                            target[i + 2] = Math.lerp(target[i + 2], source[sourceIndex + 2], linearAlpha);
                                            target[i + 3] = Math.lerp(target[i + 3], source[sourceIndex + 3], linearAlpha);
                                        }
                                    }

                                    // Move to next row in target
                                    targetIndex += ((documentInfo.width - sourceBounds.right) + sourceBounds.left) * 4;
                                }

                                pixmap.pixels = target;
                                pixmap.width = documentInfo.width;
                                pixmap.height = documentInfo.height;
                            }

                            pixmaps[channel] = pixmap;
                        });
                    }

                })).catch((error) =>
                {
                    // Do not swallow the error
                    throw error;
                });

            })).catch((error) =>
            {
                // Do not swallow the error
                throw error;
            });

        }).then(() =>
        {
            // 5 - We have all the pixmaps, now we should merge them together based
            // on target channel data
            // NOTE: input and output are ARGB, keep that in mind!
            for (let targetIndex = 0; targetIndex < targets.length; targetIndex++)
            {
                const target = targets[targetIndex];

                // Create output buffer
                const buffer = new Buffer(pixmapBufferSize);
                const channels = target.channels;

                if (target.channelsLocked && channels[3] < 0)
                {
                    // RGB with no alpha, perform quick copy of pixmap's buffer
                    // No need to fill alpha with black as it will be discarded on export anyway
                    // Note: buffer is copied (not shared) as some modification might occur
                    // later on the pixels buffer (i.e. normalization), and we might still need
                    // the original pixmap for other export targets
                    pixmaps[channels[0]].pixels.copy(buffer);
                }
                else
                {
                    // Compose ARGB channels

                    // Alpha
                    // Special care is needed because the alpha channel data is in the RGB channels of the pixmap,
                    // and NOT in the alpha channel, so we copy the alpha data from the red channel
                    if (channels[3] > -1)
                    {
                        _copyPixels(pixmaps[channels[3]].pixels, buffer, 1, 0);
                    }
                    else
                    {
                        _fillPixels(buffer, 0, 1);
                    }

                    // RGB
                    for (let channelIndex = 0; channelIndex < 3; channelIndex++)
                    {
                        if (channels[channelIndex] > -1)
                        {
                            _copyPixels(pixmaps[channels[channelIndex]].pixels, buffer, channelIndex + 1, channelIndex + 1);
                        }
                        else
                        {
                            _fillPixels(buffer, channelIndex + 1, 0);
                        }
                    }
                }

                // Normal map normalization
                if (target.normal.normalize)
                {
                    let magnitude, r, g, b;

                    // We do not care about alpha channel, start at pixel #1
                    for (let pixelIndex = 1; pixelIndex < buffer.length; pixelIndex = pixelIndex + 4)
                    {
                        // Unpack
                        r = buffer[pixelIndex] - 127;
                        g = buffer[pixelIndex + 1] - 127;
                        b = buffer[pixelIndex + 2] - 127;

                        // Normalize
                        magnitude = Math.sqrt((r * r) + (g * g) + (b * b));
                        r = r / magnitude;
                        g = g / magnitude;
                        b = b / magnitude;

                        // Repack
                        buffer[pixelIndex] = (r * 0.5 * 0xFF) + 127;
                        buffer[pixelIndex + 1] = (g * 0.5 * 0xFF) + 127;
                        buffer[pixelIndex + 2] = (b * 0.5 * 0xFF) + 127;
                    }
                }

                // All done, save output buffer
                outputs[targetIndex].pixels = buffer;
            }

        }).then(() =>
        {
            // 6 - Let ImageMagick process the outputs in parallel
            return Promise.all(outputs.map((output) =>
            {
                const args = this._getConvertInputArgs(output, options);

                if (output.target.format === FORMATS.RAW)
                {
                    // Save to buffer
                    return this._convertToBuffer(args, output);
                }
                else
                {
                    // Save to file
                    return this._convertToFile(args, output);
                }
            }));

        }).then(() =>
        {
            const endTime = (performance.now() - startTime);
            logger.info('Export took', endTime, 'ms.');

            // Success!
            return outputs;

        }).catch((error) =>
        {
            // Error
            logger.error(error);
            throw error;

        });
    }

    /**
     * Gets input arguments for ImageMagick.
     * @private
     */
    _getConvertInputArgs(output, options)
    {
        const target = output.target,
            hasAlpha = (target.channels[3] > -1);

        var args = [];
        args.push(
            // In order to know the pixel boundaries, ImageMagick needs to know the resolution and pixel depth
            // Must be set BEFORE 'rgba:-' and other arguments
            '-size', output.documentInfo.width + 'x' + output.documentInfo.height,
            '-depth', String(output.documentInfo.depth),
            // ARGB -> RGBA
            '-color-matrix', '0 1 0 0, 0 0 1 0, 0 0 0 1, 1 0 0 0'
        );

        // Read the pixels in RGBA form from STDIN
        args.push('rgba:-');

        // Color type and alpha
        // Needed to force image to be saved as RGB even if it only contains grayscale
        // values. Greyscale images are not imported correctly by some engines (i.e. Unreal Engine)
        if (hasAlpha)
        {
            args.push('-type', 'TrueColorAlpha');
        }
        else
        {
            args.push('-type', 'TrueColor');
        }

        // Scaling
        // Need to set off alpha so that the resize operation doesn't keep alpha into account
        args.push('-alpha', 'off');
        args.push('-resize');

        switch (target.scale)
        {
            case 2:
                args.push('200%');
                break;
            case 1:
                args.push('100%');
                break;
            case 0.5:
                args.push('50%');
                break;
            case 0.25:
                args.push('25%');
                break;
            case 0.125:
                args.push('12.5%');
                break;
        }

        if (hasAlpha)
        {
            // Set alpha back on if needed, so filters will be applied to it, too
            args.push('-alpha', 'on');
        }

        // Filters
        const filters = target.filters;

        if (filters)
        {
            if (filters.blur === true)
            {
                args.push('-blur', '1x1');
            }

            if (filters.sharpen === true)
            {
                args.push('-sharpen', '2x1');
            }

            if (filters.invert === true)
            {
                args.push('-negate');
            }
        }

        // Normal
        const normal = target.normal;

        if (normal)
        {
            if (normal.flipX === true)
            {
                args.push('-channel', 'r');
                args.push('-negate');
                args.push('+channel');
            }

            if (normal.flipY === true)
            {
                args.push('-channel', 'g');
                args.push('-negate');
                args.push('+channel');
            }

            if (normal.flipZ === true)
            {
                args.push('-channel', 'b');
                args.push('-negate');
                args.push('+channel');
            }
        }

        // Output format
        return this._getConvertOutputArgs(args, target.format, hasAlpha, options);
    }

    /**
     * Gets output arguments for ImageMagick.
     * @private
     */
    _getConvertOutputArgs(args, format, hasAlpha, options)
    {
        switch (format)
        {
            case FORMATS.RAW:
                args.push('rgba:-');
                break;

            case FORMATS.PNG:
                args.push('-define', 'png:exclude-chunk=date');

                if (hasAlpha)
                {
                    args.push('-define', 'png:color-type=6');
                    args.push('png32:-');
                }
                else
                {
                    args.push('-alpha', 'off');
                    args.push('-define', 'png:color-type=2');
                    args.push('png24:-');
                }
                break;

            case FORMATS.JPG:
                args.push('-alpha', 'off');
                args.push('-quality', '100');
                args.push('jpg:-');
                break;

            case FORMATS.TGA:
                if (options && options.enableTGACompression)
                {
                    args.push('-compress', 'RLE');
                }
                args.push('tga:-');
                break;

            case FORMATS.TIFF:
                // FIXME: remove premultiplied alpha
                args.push('-define', 'tiff:alpha=unassociated');
                args.push('tiff:-');
                break;

            case FORMATS.PSD:
                // FIXME: remove premultiplied alpha
                args.push('psd:-');
                break;
        }

        return args;
    }

    /**
     * Saves the specified exporter output to file using ImageMagick.
     * @private
     */
    _convertToFile(args, output)
    {
        return new Promise((resolve, reject) =>
        {
            const filePath = output.target.path;

            // Setup a file stream to the output file
            const fileStream = fs.createWriteStream(filePath);
            fileStream.on('error', (err) =>
            {
                reject(`Could not create write stream for file ${filePath}. ${err}`);
            });

            // Launch convert
            const convertProc = spawn(this.photoshop.paths.convert, args);

            const onImageMagickError = (err) =>
            {
                try
                {
                    fileStream.close();
                }
                catch (e)
                {
                    logger.error('Error when closing file stream', e);
                }

                try
                {
                    if (fs.existsSync(filePath))
                    {
                        fs.unlinkSync(filePath);
                    }
                }
                catch (e)
                {
                    logger.error('Error when deleting file', filePath, e);
                }

                reject(new Error(err));
            }

            // Handle errors
            convertProc.on('error', (err) => { onImageMagickError(`Error with convert: ${err}`); });
            convertProc.stdin.on('error', (err) => { onImageMagickError(`Error with convert STDIN: ${err}`); });
            convertProc.stdout.on('error', (err) => { onImageMagickError(`Error with convert STDOUT: ${err}`); });
            convertProc.stderr.on('error', (err) => { onImageMagickError(`Error with convert STDERR: ${err}`); });
            fileStream.on('error', (err) => { onImageMagickError(`Error with stream to temporary file: ${err}`); });

            // Capture STDERR
            let stderr = '';
            convertProc.stderr.on('data', (chunk) =>
            {
                stderr += chunk;
            });

            // Pipe convert's output (the produced image) into the file stream
            convertProc.stdout.pipe(fileStream);

            // Send the pixmap to convert
            convertProc.stdin.end(output.pixels);

            // Wait until convert is done (pipe from the last utility will close the stream)
            fileStream.on('close', () =>
            {
                if (stderr)
                {
                    reject(new Error(`ImageMagick error: ${stderr}`));
                }
                else
                {
                    resolve();
                }
            });
        });
    }

    /**
     * Saves the specified exporter output to a buffer using ImageMagick.
     * @private
     */
    _convertToBuffer(args, output)
    {
        return new Promise((resolve, reject) =>
        {
            // Launch convert
            const convertProc = spawn(this.photoshop.paths.convert, args);

            // Handle errors
            convertProc.on('error', (err) => { reject(new Error(`Error with convert: ${err}`)); });
            convertProc.stdin.on('error', (err) => { reject(new Error(`Error with convert STDIN: ${err}`)); });
            convertProc.stdout.on('error', (err) => { reject(new Error(`Error with convert STDOUT: ${err}`)); });
            convertProc.stderr.on('error', (err) => { reject(new Error(`Error with convert STDERR: ${err}`)); });

            // Capture STDERR
            let stderr = '';
            convertProc.stderr.on('data', (chunk) =>
            {
                stderr += chunk;
            });

            // Handle data
            const buffers = [];

            convertProc.on('data', (data) =>
            {
                buffers.push(data);
            });

            convertProc.on('end', () =>
            {
                if (stderr)
                {
                    reject(new Error(`ImageMagick error: ${stderr}`));
                }
                else
                {
                    output.pixels = Buffer.concat(buffers);
                    resolve();
                }
            });

            // Send the pixmap to convert
            convertProc.stdin.end(output.pixels);
        });
    }

    /**
     * Saves a pixel buffer to file. Assumes 8-bit RGBA input.
     * @return {Promise} A promise.
     */
    savePixelsToFile(pixels, width, height, savePath, saveFormat)
    {
        const args = [
            '-size', `${width}x${height}`,
            '-depth', '8',
            'rgba:-',
            '-type', 'TrueColorAlpha'
        ];

        this._getConvertOutputArgs(args, saveFormat, true);
        return this._convertToFile(args, savePath, pixels);
    }

}
