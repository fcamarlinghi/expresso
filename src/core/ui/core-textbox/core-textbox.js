
import CoreField from '../core-field/core-field.js';
import './core-textbox.less';

export default CoreField.extend({

    template: require('./core-textbox.html'),

    twoway: true,

    data: {

        /**
         * Field value.
         * @type String
         * @default ''
         */
        value: '',

        /**
         * Placeholder text that hints to the user what can be entered in the input.
         * @type String
         * @default null
         */
        placeholder: null,

        /**
         * If true, the user cannot modify the value of the input.
         * @type Boolean
         * @default false
         */
        readonly: false,

    },

    keydownAction: function (e)
    {
        if (this.get('disabled') || this.get('readonly'))
            return;

        e.original.stopPropagation();

        if (e.original.keyCode === 13)
            this.field.blur();
    },

});
