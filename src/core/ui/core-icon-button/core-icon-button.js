
import CoreButton from '../core-button/core-button.js';
import './core-icon-button.less';

export default CoreButton.extend({

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
         * fallback to the standard icon if not specified.
         * @type String
         * @default ''
         */
        iconactive: '',

        /**
         * Icon used when the button is in the 'disabled' state,
         * fallback to the standard icon if not specified.
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

    },

    computed:{

        currentIcon: function ()
        {
            const disabledIcon = this.get('icondisabled'),
                activeIcon = this.get('iconactive'),
                disabled = this.get('disabled'),
                active = this.get('active');
    
            let icon = this.get('icon');
            if (disabled && disabledIcon.length)
            {
                icon = disabledIcon;
            }
            else if (active && activeIcon.length)
            {
                icon = activeIcon;
            }
            return icon;
        }

    },

});
