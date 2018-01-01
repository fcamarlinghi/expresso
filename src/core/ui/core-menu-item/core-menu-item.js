
import CoreBase from '../core-base/core-base.js';
import './core-menu-item.less';

export default CoreBase.extend({

    template: require('./core-menu-item.html'),

    data: {

        /**
         * Value for this menu item (i.e. used with dropdown lists).
         * @type String
         * @default null
         */
        value: null,

        /**
         * Whether this menu item is currently selected (i.e. used with dropdown lists).
         * @type Boolean
         * @default false
         */
        selected: false,

        /**
         * If true, this menu item won't be selectable by user.
         * @type Boolean
         * @default false
         */
        disabled: false,

        /**
         * Whether this menu item is visible to user.
         * @type Boolean
         * @default true
         */
        visible: true,

    },

});
