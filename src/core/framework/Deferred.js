
const noop = function () {};

/**
 * Barebone Deferred implementation.
 */
export default class Deferred
{
    constructor()
    {
        let _progressed = noop;

        this.resolve = null;
        this.reject = null;
        this.promise = new Promise((resolve, reject) =>
        {
            this.resolve = resolve;
            this.reject = reject;
        });
        this.progressed = (func) => { _progressed = (typeof func === 'function') ? func : noop; return this.promise; };
        this.notify = (value) =>
        {
            if (_progressed)
            {
                _progressed(value);
            }
        };
    }
}
