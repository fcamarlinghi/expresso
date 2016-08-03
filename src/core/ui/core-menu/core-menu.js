
var CoreBase = require('../core-base/core-base.js');

require('./core-menu.less');

var component = CoreBase.extend({

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

module.exports = component;
