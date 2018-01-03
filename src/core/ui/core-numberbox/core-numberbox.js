
import CoreField from '../core-field/core-field.js';
import './core-numberbox.less';

export const realms = ['integer', 'real'];

export default CoreField.extend({

    template: require('./core-numberbox.html'),

    twoway: true,

    data: {

        /**
         * Field value.
         * @type Number
         * @default 0
         */
        value: 0,

        /**
         * The number that indicates the minimum value of the range.
         * @type number
         * @default 0
         */
        min: 0,

        /**
         * The number that indicates the maximum value of the range.
         * @type number
         * @default 100
         */
        max: 100,

        /**
         * Specifies the value granularity of the range's value.
         * @type number
         * @default 1
         */
        step: 1,

        /**
         * Specifies the value precision, only applies when 'realm' is set to 'real'.
         * @type number
         * @default 1
         */
        precision: 1,

        /**
         * Specifies the value realm. Valid values: 'integer', 'real'.
         * @type string
         * @default 'integer'
         */
        realm: 'real',

        /**
         * If true, the user cannot modify the value of the input.
         * @type Boolean
         * @default false
         */
        readonly: false,

    },

    oninit: function ()
    {
        this._super();
        this.observe('value min max step precision', this.updateValue, { init: false });
        this.observe('realm', function (newValue)
        {
            if (realms.indexOf(newValue) < 0)
            {
                throw new TypeError('Invalid realm: ' + newValue);
            }

            // Convert current value to new type
            this.updateValue(this.get('value'), this.get('value'), 'value');
        });
    },

    updateValue: function (value, old, keypath)
    {
        if (value !== undefined && value !== null)
        {
            if (this.get('realm') === 'integer')
            {
                value = value | 0;
            }
            else
            {
                value = +value.toFixed(this.get('precision'));
            }

            this.set(keypath, value);
        }
    },

    keydownAction: function (e)
    {
        if (this.get('disabled') || this.get('readonly'))
        {
            return;
        }

        e.original.stopPropagation();

        if (e.original.keyCode === 13)
        {
            this.field.blur();
        }
    },

});
