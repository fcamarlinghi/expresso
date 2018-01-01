
import CoreBase from '../core-base/core-base.js';
import './core-toolbar.less';

export default CoreBase.extend({

    template: require('./core-toolbar.html'),

    data: {

        /**
         * Whether the toolbar should develop vertically.
         * @type Boolean
         * @default false
         */
        vertical: false,

    },

    onrender: function ()
    {
        this._super();
        this.setupButtons();
    },

    setupButtons: function ()
    {
        // Make sure all the buttons are toolbar buttons
        var buttons = this.findAllComponents();

        for (var i = 0; i < buttons.length; i++)
        {
            if (buttons[i].get('toolbar') !== undefined)
            {
                buttons[i].set('toolbar', true);
            }
        }
    },

});
