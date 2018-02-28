
import CoreBase from '../core-base/core-base.js';

export default CoreBase.extend({

    template: require('./core-label.html'),

    data: {

        /**
         * If true, the label is rendered greyed-out.
         * @type Boolean
         * @default false
         */
        disabled: false,

    },

});
