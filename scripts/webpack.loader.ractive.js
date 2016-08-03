
/**
 * Webpack loader for Ractive components.
 */

'use strict';

const Ractive = require('ractive'),
      htmlclean = require('htmlclean');

const load = function (content)
{
    const parsed = Ractive.parse(htmlclean(content));
    this.cacheable();
    return 'module.exports = ' + JSON.stringify(parsed) + ';';
};

module.exports = load;
