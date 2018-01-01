
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

    imageElement: null,
    spinnerElement: null,
    messageElement: null,

    oninit: function ()
    {
        this._super();
        this.center = this.center.bind(this);

        this.observe('visible', function (newValue)
        {
            if (newValue)
            {
                window.addEventListener('resize', this.center);
                this.center();
            }
            else
            {
                window.removeEventListener('resize', this.center);
            }

        }, { defer: true });
    },

    onrender: function ()
    {
        this._super();
        this.imageElement = this.find('#image');
        this.spinnerElement = this.find('#spinner');
        this.messageElement = this.find('#message');
    },

    onunrender: function ()
    {
        this._super();
        this.messageElement = null;
        this.spinnerElement = null;
        this.imageElement = null;
    },

    onteardown: function ()
    {
        window.removeEventListener('resize', this.center);
        this._super();
    },

    center: function ()
    {
        var size = this.get('size'),
            halfSize = size / 2;

        // Center to window
        this.imageElement.style.top = ((window.innerHeight / 2) - halfSize + size * 0.125) + 'px';
        this.imageElement.style.left = ((window.innerWidth / 2) - halfSize + size * 0.125) + 'px';
        this.imageElement.style.width = this.imageElement.style.height = (size * 0.75) + 'px';

        this.spinnerElement.style.top = ((window.innerHeight / 2) - halfSize - 8) + 'px';
        this.spinnerElement.style.left = ((window.innerWidth / 2) - halfSize - 8) + 'px';
        this.spinnerElement.style.width = this.spinnerElement.style.height = size + 'px';

        this.messageElement.style.top = ((window.innerHeight / 2) + halfSize + 32) + 'px';
        this.messageElement.style.width = window.innerWidth + 'px';
    },

});
