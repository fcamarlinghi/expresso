
import path from 'path';
import fs from 'fs';
import pathIsAbsolute from 'path-is-absolute';
import Logger from './Logger.js';

// Promisify some Node functions
const readFile = Promise.promisify(fs.readFile),
    exists = Promise.promisify(fs.exists),
    writeFile = Promise.promisify(fs.writeFile),
    unlink = Promise.promisify(fs.unlink);

// Utilities
const isWindows = (path.sep === '\\');

/**
 * Beautifies the relative file path.
 * @param {String} filePath File path.
 * @return {String} Beautified path.
 */
function beautifyRelativePath(filePath)
{
    // Make sure there are no URI encoded characters
    let outPath = decodeURI(filePath);

    // Show platform specific slashes
    if (path.sep === '\\')
    {
        outPath = outPath.replace(/\//g, path.sep);
    }
    else
    {
        outPath = outPath.replace(/\\/g, path.sep);
    }

    // Beautify path
    if (outPath === '.')
    {
        // Path is the same folder as document, with no file path
        // (i.e. export path, should output '.\')
        outPath = '.' + path.sep;
    }
    else if (outPath.endsWith('..'))
    {
        // Path is a parent of the document folder, with no file path
        // (i.e. export path, should output '..\')
        outPath += path.sep;
    }
    else if (!outPath.startsWith('.'))
    {
        // Path is a child of the document folder, or is a file path
        // (i.e. export path, or previewer file path)
        outPath = '.' + path.sep + outPath;
    }

    return outPath;
}

// Logger
const logger = new Logger('FileSystem');

/**
 * Static utilities that helps managing files.
 */
export default class FileSystem
{

    /** 
     * Opens a stream to read a file from disk.
     * @param {String} filePath File path.
     * @param {Object} [options={}] File read options.
     * @return {Stream} File stream.
     */
    static readFileStream(filePath, options)
    {
        const validOptions = options || {};

        logger.debug('readFileStream:', filePath, validOptions);
        const stream = fs.createReadStream(filePath, validOptions);
        return stream;
    }

    /** 
     * Asynchronously reads a file from disk.
     * @param {String} filePath File path.
     * @param {Object} [options={}] File read options.
     * @return {Promise} A promise.
     */
    static readFile(filePath, options)
    {
        const validOptions = options || {};

        logger.debug('readFile:', filePath, validOptions);
        return readFile(filePath, validOptions);
    }

    /** 
     * Asynchronously checks that a file exists on disk.
     * @param {String} filePath File path.
     * @return {Promise} A promise.
     */
    static exists(filePath)
    {
        logger.debug('exists:', filePath);
        return exists(filePath);
    }

    /** 
     * Asynchronously writes a file to disk.
     * @param {String} filePath File path.
     * @param {Any} content File content.
     * @param {Object} [options={}] File write options.
     * @return {Promise} A promise.
     */
    static writeFile(filePath, content, options)
    {
        const validOptions = options || {};

        logger.debug('writeFile:', filePath, content, validOptions);
        return writeFile(filePath, content, validOptions.encoding);
    }

    /** 
     * Asynchronously deletes a file from disk.
     * @param {String} filePath File path.
     * @return {Promise} A promise.
     */
    static deleteFile(filePath)
    {
        logger.debug('deleteFile:', filePath);
        return unlink(filePath);
    }

    /**
     * Gets a relative path from filePath to base, beautifying the output path.
     * @param {String} basePath Base path.
     * @param {String} filePath Absolute file path.
     * @return {String} The beautified relative path from base to file.
     */
    static getRelativePath(basePath, filePath)
    {
        const outPath = path.relative(basePath, filePath);

        // Beautify the path
        return beautifyRelativePath(outPath);
    }

    /**
     * Shows a folder selection dialog.
     * @param {String} title Dialog title.
     * @param {String} initialPath Absolute path to use as a starting point for the selection dialog.
     * @param {String} [basePath] If provided, and initialPath is a relative path, initialPath will be relative to this.
     * @param {Boolean} [convertToRelative=false] If true, and basePath is provided, output path will be converted to be relative to basePath.
     * @return {String,null} The selected folder path, or null if an error happened.
     */
    static showOpenFolderDialog(title, initialPath, basePath, convertToRelative)
    {
        String.isString(initialPath) || (initialPath = '');
        const hasBasePath = !String.isEmpty(basePath);

        // Try to resolve initial path if relative
        if (initialPath.startsWith('.') && hasBasePath)
        {
            initialPath = FileSystem.getAbsolutePath(basePath, initialPath);
        }

        // Show dialog
        const result = window.cep.fs.showOpenDialog(false, true, title, initialPath);

        if (result.err === window.cep.fs.NO_ERROR)
        {
            let outPath = result.data[0];

            if (String.isEmpty(outPath))
            {
                return null;
            }
            else
            {
                // Eventually convert the output path to relative
                // On Windows, do not allow use of relative paths between different drives
                if (!!convertToRelative
                    && hasBasePath
                    && (!isWindows || basePath.startsWith(outPath.substr(0, 2))))
                {
                    outPath = FileSystem.getRelativePath(basePath, outPath);
                }

                return outPath;
            }
        }

        return null;
    }

    /**
     * Shows a file selection dialog.
     * @param {String} title Dialog title.
     * @param {String} initialPath Absolute path to use as a starting point for the selection dialog.
     * @param {Array.<string>} fileTypes The file extensions (without the dot) for the types of files that can be selected (e.g.: ["gif", "jpg", "jpeg"]).
     * @param {String} fileTypesPrefix Text to put in front of the extensions of files that can be selected (e.g.: "Images").
     * @param {String} [basePath] If provided, and initialPath is a relative path, initialPath will be relative to this.
     * @param {Boolean} [convertToRelative=false] If true, and basePath is provided, output path will be converted to be relative to basePath.
     * @return {String,null} The selected file path, or null if an error happened.
     */
    static showOpenFileDialog(title, initialPath, fileTypes, fileTypesPrefix, basePath, convertToRelative)
    {
        String.isString(initialPath) || (initialPath = '');
        const hasBasePath = !String.isEmpty(basePath);

        // Try to resolve initial path if relative
        if (initialPath.startsWith('.') && hasBasePath)
        {
            initialPath = FileSystem.getAbsolutePath(basePath, initialPath);
        }

        // Show dialog
        const result = window.cep.fs.showOpenDialogEx(false, false, title, initialPath, fileTypes, fileTypesPrefix);

        if (result.err === window.cep.fs.NO_ERROR)
        {
            let outPath = result.data[0];

            if (String.isEmpty(outPath))
            {
                return null;
            }
            else
            {
                // Eventually convert the output path to relative
                // On Windows, do not allow use of relative paths between different drives
                if (!!convertToRelative
                    && hasBasePath
                    && (!isWindows || basePath.startsWith(outPath.substr(0, 2))))
                {
                    outPath = FileSystem.getRelativePath(basePath, outPath);
                }

                return outPath;
            }
        }

        return null;
    }
}

// Aliases

/**
 * Gets an absolute path from a path which is relative to base.
 * @param {String} basePath Base path.
 * @param {String} filePath Relative file path.
 * @return {String} The absolute path.
 * @remarks This is just an alias for 'path.resolve', provided to created a more consistent API.
 */
FileSystem.getAbsolutePath = path.resolve;

/**
 * Gets whether the provided string is an absolute path.
 * @param {String} path Path to check.
 * @param {String} filePath Relative file path.
 * @return {Boolean} True if the path is absolute; otherwise, false.
 * @remarks This is a polyfill for the 'path.isAbsolute' function that is missing in Node 0.8.22.
 */
FileSystem.isAbsolutePath = pathIsAbsolute;
