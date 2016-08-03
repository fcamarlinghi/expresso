
'use strict';

var Promise = require('bluebird');

/**
 * Barebone Deferred implementation.
 *
 * NOTE: for the moment depends on Bluebird supporting the '_progress'
 * method on Promises, which was deprecated in version 3.0.
 */
function Deferred()
{
    var resolve, reject;

    var promise = new Promise(function ()
    {
        resolve = arguments[0];
        reject = arguments[1];
    });

    this.resolve = resolve;
    this.reject = reject;
    this.promise = promise;
    this.notify = function (value)
    {
        promise._progress(value);
    };
};

Deferred.prototype = Object.create(null);
Deferred.constructor = Deferred;

module.exports = Deferred;
