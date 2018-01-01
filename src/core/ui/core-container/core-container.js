
import CoreBase from '../core-base/core-base.js';
import './core-container.less';

export default CoreBase.extend({

    template: require('./core-container.html'),

    data: {

        /**
         * Gets or sets the container direction.
         * Valid values are 'horizontal', 'vertical', 'both'.
         * @default 'vertical'
         */
        direction: 'vertical',

    },

});
