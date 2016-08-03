
var CoreBase = require('../core-base/core-base.js');

require('./core-menu-separator.less');

var component = CoreBase.extend({

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

module.exports = component;
