
import CoreBase from '../core-base/core-base.js';
import './core-menu-separator.less';

export default CoreBase.extend({

    template: require('./core-menu-separator.html'),

    data: {

        /**
         * Whether this separator is visible to user.
         * @type Boolean
         * @default true
         */
        visible: true,

    },

});
