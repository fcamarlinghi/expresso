
var CoreBase = require('../core-base/core-base.js');

require('./core-container.less');

var component = CoreBase.extend({

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

module.exports = component;
