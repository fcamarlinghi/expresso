
/**
 * Webpack loader for Extendscript files.
 */

'use strict';

const yui = require('yuicompressor');

const load = function (content)
{
    const callback = this.async();
    this.cacheable();

    yui.compress(
        content,
        {
            charset: 'utf8',
            type: 'js',
            nomunge: true,
            'preserve-semi': true
        },
        (error, data, extra) => callback(error, 'module.exports = ' + JSON.stringify(data) + ';')
    );
};

module.exports = load;
