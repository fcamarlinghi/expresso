
import CoreField from '../core-field/core-field.js';
import './core-button.less';

export default CoreField.extend({

    template: require('./core-button.html'),

    twoway: true, // Needed for toggleable buttons

    data: {

        /**
         * Gets or sets the label for this button.
         * @type String
         * @default ''
         */
        label: '',

        /**
         * Gets or sets whether this a toggleable button.
         * @type Boolean
         * @default false
         */
        toggleable: false,

        /**
         * If true, the button is currently active because the button
         * is toggleable and is currently in the active state.
         * @type boolean
         * @default false
         */
        active: false,

    },

    on: {

        tap: function (event)
        {
            if (!this.get('disabled') && this.get('toggleable'))
            {
                var active = !this.get('active');
                this.set('active', active);
                this.fire('toggle', active);
            }
        },

    },

    cacheFieldElement: function ()
    {
        this.field = this.find('button');
    },

});
