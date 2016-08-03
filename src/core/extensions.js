
if (RELEASE)
{
    // Replace some base prototype functions with fast.js implementations for additional speed
    var fast = require('fast.js'),
        slice = Array.prototype.slice;

    Array.prototype.concat = function () { var args = slice.call(arguments, 0); args.unshift(this); return fast.apply(fast['array'].concat, fast, args); };
    Array.prototype.indexOf = function (item, start) { return fast['array'].indexOf.call(fast, this, item, start); };
    Array.prototype.lastIndexOf = function (item, start) { return fast['array'].lastIndexOf.call(fast, this, item, start); };
    Array.prototype.forEach = function (fn, context) { return fast['array'].forEach.call(fast, this, fn, context); };
    Array.prototype.map = function (fn, context) { return fast['array'].map(this, fn, context); };
    Array.prototype.filter = function (fn, context) { return fast['array'].filter.call(fast, this, fn, context); };
    Array.prototype.reduce = function (fn, initial) { return fast['array'].reduce.call(fast, this, fn, initial); };
    Array.prototype.reduceRight = function (fn, initial) { return fast['array'].reduceRight.call(fast, this, fn, initial); };
    Function.prototype.bind = function () { var args = slice.call(arguments, 0); args.unshift(this); return fast['function'].apply(fast.bind, fast, args); };
}

// Add some useful functions to built-in types
// Yeah I know, adding functions to existing types is bad, blah blah blah!
// defineProperties is used to hide the new methods (by marking them as non-enumerable)

Object.defineProperties(String, {

    'isString': {
        value: function (s)
        {
            return typeof s === 'string';
        },
    },

    'isEmpty': {
        value: function (s)
        {
            return typeof s !== 'string' || !s.length;
        },
    },

});

Object.defineProperties(Boolean, {

    'isBoolean': {
        value: function (b)
        {
            return typeof b === 'boolean';
        },
    },

    'toBoolean': {
        value: function (value)
        {
            value || (value = '');
            switch (value.toString().toLowerCase())
            {
                case 'false': case 'no': case '0': case '': return false;
                default: return true;
            }
        },
    },

});

Object.defineProperties(Number, {

    'isNumber': {
        value: function (n)
        {
            return typeof n === 'number' && !isNaN(n) && n !== Infinity;
        },
    },

});

Object.defineProperties(Math, {

    'clamp': {
        value: function (value, min, max)
        {
            return Math.max(min, Math.min(max, value));
        },
    },

    'lerp': {
        value: function (a, b, alpha)
        {
            // More precise (and more expensive) version
            return ((1 - alpha) * a) + (alpha * b);
            // Normal version, might not provide precise value for alpha = 1
            //return a + (alpha * (b - a));
        },
    },

});
