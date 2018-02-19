
import CoreBase from '../../ui/core-base/core-base.js';
import CoreVisible from '../../ui/core-visible/core-visible.js';
import CEP from '../../CEP.js';
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

    oninit: function ()
    {
        this._super();

        // HACK: force a hierarchy refresh in CC2015. Needed to fix a bug
        // in CEF that prevents the overlay from being hidden correctly
        if (CEP.APIVersion.major === 6 && CEP.APIVersion.minor === 0)
        {
            this.observe('visible', (newValue) =>
            {
                if (!newValue)
                {
                    setTimeout(() =>
                    {
                        let docElem = document.documentElement, docElemNext = docElem.nextSibling;
                        document.removeChild(docElem);
                        document.insertBefore(docElem, docElemNext);
                        
                    }, 50);
                }
            }, { defer: true });
        }
    },

});
