
import CoreBase from '../core-base/core-base.js';
import './core-menu.less';

export default CoreBase.extend({

    template: require('./core-menu.html'),

    twoway: true,

    lazy: true,

    data: {

        /**
         * Whether the menu is visible.
         * @type Boolean
         * @default true
         */
        visible: true,

    },

});
