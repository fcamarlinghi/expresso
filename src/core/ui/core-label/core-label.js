
var CoreBase = require('../core-base/core-base.js');

require('./core-label.less');

var component = CoreBase.extend({

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

module.exports = component;
