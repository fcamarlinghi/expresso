
import CoreBase from '../core-base/core-base.js';
import './core-icon.less';
import icons from './icons.js';

export default CoreBase.extend({

    template: require('./core-icon.html'),

    data: {

        /**
         * Tooltip for this icon.
         * @type String
         * @default null
         */
        tooltip: null,

        /**
         * The icon.
         * @type String
         * @default ''
         */
        icon: '',

        /**
         * Icons dictionary.
         * @type Object
         */
        icons: function ()
        {
            return icons;
        },

    },

});
