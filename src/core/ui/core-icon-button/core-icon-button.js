
var CoreButton = require('../core-button/core-button.js');

require('./core-icon-button.less');

var component = CoreButton.extend({

    template: require('./core-icon-button.html'),

    data: {

        /**
         * The icon for this button.
         * @type String
         * @default ''
         */
        icon: '',

        /**
         * Icon used when the button is in the 'active' state,
         * used the standard icon if not specified.
         * @type String
         * @default ''
         */
        iconactive: '',

        /**
         * Icon used when the button is in the 'disabled' state,
         * used the standard icon if not specified.
         * @type String
         * @default ''
         */
        icondisabled: '',

        /**
         * Whether the button should be rendered with a 'toolbar' style.
         * @type Boolean
         * @default false
         */
        toolbar: false,

        currentIcon: '',

    },

    oninit: function ()
    {
        this._super();

        // No need to init for every single property
        this.observe('disabled active icon iconactive icondisabled', this.updateIcon, { init: false });
        this.updateIcon();
    },

    updateIcon: function ()
    {
        var icon = this.get('icon'),
            disabledIcon = this.get('icondisabled'),
            activeIcon = this.get('iconactive'),
            disabled = this.get('disabled'),
            active = this.field === document.activeElement || this.get('active');

        if (disabled && disabledIcon.length)
            icon = disabledIcon;
        else if (active && activeIcon.length)
            icon = activeIcon;

        this.set('currentIcon', icon);
    },

});

module.exports = component;
