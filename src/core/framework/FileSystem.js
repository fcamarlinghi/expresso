
'use strict';

var Promise = require('bluebird'),
    path = require('path'),
    pathIsAbsolute = require('path-is-absolute'),
    fs = require('fs');

// Promisify some Node functions
var readFile = Promise.promisify(fs.readFile),
    exists = Promise.promisify(fs.exists),
    writeFile = Promise.promisify(fs.writeFile),
    unlink = Promise.promisify(fs.unlink);

// Utilities
var isWindows = path.sep === '\\';

/**
 * Utility class that helps managing files.
 */
function FileSystem(application)
{
    Object.defineProperties(this, {

        application: { value: application, enumerable: true },

        logger: { value: application.logManager.createLogger('FileSystem'), enumerable: true },

    });
};

// Prototype
FileSystem.prototype = Object.create(null);
FileSystem.constructor = FileSystem;

/** 
 * Opens a stream to read a file from disk.
 * @param {String} filePath File path.
 * @param {Object} [options={}] File read options.
 * @return {Stream} File stream.
 */
FileSystem.prototype.readFileStream = function (filePath, options)
{
    var validOptions = options || {};
    this.logger.debug('readFileStream:', filePath, validOptions);
    var stream = fs.createReadStream(filePath, validOptions);
    return stream;
};

/** 
 * Asynchronously reads a file from disk.
 * @param {String} filePath File path.
 * @param {Object} [options={}] File read options.
 * @return {Promise} A promise.
 */
FileSystem.prototype.readFile = function (filePath, options)
{
    var validOptions = options || {} ;

    this.logger.debug('readFile:', filePath, validOptions);
    return readFile(filePath, validOptions);
};

/** 
 * Asynchronously checks that a file exists on disk.
 * @param {String} filePath File path.
 * @return {Promise} A promise.
 */
FileSystem.prototype.exists = function (filePath)
{
    this.logger.debug('exists:', filePath);
    return exists(filePath);
};

/** 
 * Asynchronously writes a file to disk.
 * @param {String} filePath File path.
 * @param {Any} content File content.
 * @param {Object} [options={}] File write options.
 * @return {Promise} A promise.
 */
FileSystem.prototype.writeFile = function (filePath, content, options)
{
    var validOptions = options || {};

    this.logger.debug('writeFile:', filePath, content, validOptions);
    return writeFile(filePath, content, validOptions.encoding);
};

/** 
 * Asynchronously deletes a file from disk.
 * @param {String} filePath File path.
 * @return {Promise} A promise.
 */
FileSystem.prototype.deleteFile = function (filePath)
{
    this.logger.debug('deleteFile:', filePath);
    return unlink(filePath);
};

/**
 * Beautifies the relative file path.
 * @param {String} filePath File path.
 * @return {String} Beautified path.
 * @private
 */
FileSystem.prototype._beautifyRelativePath = function (filePath)
{
    // Make sure there are no URI encoded characters
    var outPath = decodeURI(filePath);

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
};

/**
 * Gets a relative path from filePath to base, beautifying the output path.
 * @param {String} basePath Base path.
 * @param {String} filePath Absolute file path.
 * @return {String} The beautified relative path from base to file.
 */
FileSystem.prototype.getRelativePath = function (basePath, filePath)
{
    var outPath = path.relative(basePath, filePath);

    // Beautify the path
    return this._beautifyRelativePath(outPath);
};

/**
 * Gets an absolute path from a path which is relative to base.
 * @param {String} basePath Base path.
 * @param {String} filePath Relative file path.
 * @return {String} The absolute path.
 * @remarks This is just an alias for 'path.resolve', provided to created a more consistent API.
 */
FileSystem.prototype.getAbsolutePath = path.resolve;

/**
 * Gets whether the provided string is an absolute path.
 * @param {String} path Path to check.
 * @param {String} filePath Relative file path.
 * @return {Boolean} True if the path is absolute; otherwise, false.
 * @remarks This is a polyfill for the 'path.isAbsolute' function that is missing in Node 0.8.22.
 */
FileSystem.prototype.isAbsolutePath = pathIsAbsolute;

/**
 * Shows a folder selection dialog.
 * @param {String} title Dialog title.
 * @param {String} initialPath Absolute path to use as a starting point for the selection dialog.
 * @param {String} [basePath] If provided, and initialPath is a relative path, initialPath will be relative to this.
 * @param {Boolean} [convertToRelative=false] If true, and basePath is provided, output path will be converted to be relative to basePath.
 * @return {String,null} The selected folder path, or null if an error happened.
 */
FileSystem.prototype.showOpenFolderDialog = function (title, initialPath, basePath, convertToRelative)
{
    String.isString(initialPath) || (initialPath = '');
    var hasBasePath = !String.isEmpty(basePath);

    // Try to resolve initial path if relative
    if (initialPath.startsWith('.') && hasBasePath)
    {
        initialPath = this.getAbsolutePath(basePath, initialPath);
    }

    // Show dialog
    var result = window.cep.fs.showOpenDialog(false, true, title, initialPath);

    if (result.err === window.cep.fs.NO_ERROR)
    {
        var outPath = result.data[0];

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
                outPath = this.getRelativePath(basePath, outPath);
            }

            return outPath;
        }
    }

    return null;
};

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
FileSystem.prototype.showOpenFileDialog = function (title, initialPath, fileTypes, fileTypesPrefix, basePath, convertToRelative)
{
    String.isString(initialPath) || (initialPath = '');
    var hasBasePath = !String.isEmpty(basePath);

    // Try to resolve initial path if relative
    if (initialPath.startsWith('.') && hasBasePath)
    {
        initialPath = this.getAbsolutePath(basePath, initialPath);
    }

    // Show dialog
    var result = window.cep.fs.showOpenDialogEx(false, false, title, initialPath, fileTypes, fileTypesPrefix);

    if (result.err === window.cep.fs.NO_ERROR)
    {
        var outPath = result.data[0];

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
                outPath = this.getRelativePath(basePath, outPath);
            }

            return outPath;
        }
    }

    return null;
};

module.exports = FileSystem;
