
import CoreField from '../core-field/core-field.js';
import './core-checkbox.less';

export default CoreField.extend({

    template: require('./core-checkbox.html'),

    twoway: true,

    data: {

        /**
         * Field value.
         * @type Boolean
         * @default false
         */
        value: false,

        /**
         * If true, the element currently has focus due to keyboard
         * navigation.
         *
         * @attribute focused
         * @type boolean
         * @default false
         */
        focused: false,

        /**
         * If true, the user is currently holding down the button.
         *
         * @attribute pressed
         * @type boolean
         * @default false
         */
        pressed: false,

        /**
         * Tabindex of this field.
         * @type String
         * @default null
         */
        tabindex: 0,

    },

    computed: {

        icon: function () { return this.get('value') ? 'checkmark' : ''; }

    },

    focusAction: function ()
    {
        if (this.get('disabled'))
        {
            return;
        }

        if (!this.get('pressed'))
        {
            // Only render the "focused" state if the element gains focus due to
            // keyboard navigation.
            this.set('focused', true);
        }
    },

    blurAction: function ()
    {
        if (this.get('disabled'))
        {
            return;
        }

        this.set('focused', false);
    },

    downAction: function ()
    {
        if (this.get('disabled'))
        {
            return;
        }

        this.set('pressed', true);
        this.set('focused', false);
    },

    clickAction: function (event)
    {
        if (this.get('disabled'))
        {
            return;
        }

        // HACK: when core-checkbox is wrapped into a <label>
        // we need to filter the location clicked by the user
        // to avoid double toggling the checkbox
        if (event.target !== this.field)
        {
            // This is based on the fact that when a label is clicked,
            // the event target is actually the checkbox input field
            event.preventDefault();
            this.toggle('value');
            this.fire('toggle', this.get('value'));
        }
    },

    upAction: function ()
    {
        if (this.get('disabled'))
        {
            return;
        }

        this.set('pressed', false);
    },

});
