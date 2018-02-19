
import CoreBase from '../../ui/core-base/core-base.js';
import CoreVisible from '../../ui/core-visible/core-visible.js';
import './core-throbber.less';

export default CoreBase.extend({

    template: require('./core-throbber.html'),

    decorators: { 'core-visible': CoreVisible },

    data: {

        /**
         * Whether the throbber should be visible.
         * @type Boolean
         * @default false
         */
        visible: false,

        /**
         * Optional message shown alongside the throbber.
         * @type String
         * @default ''
         */
        message: '',

        /**
         * Throbber size (in px).
         * @type Number
         * @default 150
         */
        size: 150,

    },

});
