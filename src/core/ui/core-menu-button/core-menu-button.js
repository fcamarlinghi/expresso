
import CoreIconButton from '../core-icon-button/core-icon-button.js';
import './core-menu-button.less';

export default CoreIconButton.extend({

    template: require('./core-menu-button.html'),

    isolated: false, // Needed to support subcomponents

    data: {

        /**
         * Whether the menu is open.
         * @type Boolean
         * @default false
         */
        open: false,

    },

    menu: null,

    oninit: function ()
    {
        this._super();
        this.toggleMenu = this.toggleMenu.bind(this);
        this.on('toggle', this.toggleMenu, { init: false });
    },

    onrender: function ()
    {
        this._super();
        this.menu = this.findComponent('core-menu');
    },

    onteardown: function ()
    {
        // Cleanup
        this.menu = null;
        this.off('toggle', this.toggleMenu);
        this._super();
    },

    toggleMenu: function (event)
    {
        // Do not force close the menu when clicking on an element
        if (event && this.menu.find('div').contains(event.target))
        {
            return;
        }

        this.toggle('open');
        document.body.removeEventListener('click', this.toggleMenu);

        if (this.get('open'))
        {
            this.set('active', true);
            this.showMenu();

            setTimeout(function ()
            {
                document.body.addEventListener('click', this.toggleMenu);
            }.bind(this));

            this.fire('open', { open: true });
        }
        else
        {
            this.set('active', false);
            this.fire('open', { open: false });
        }
    },

    showMenu: function ()
    {
        var menu = this.menu.find('div'),
            padding = 4;

        // Position the menu
        var parentBounds = this.field.getBoundingClientRect(),
            menuBounds = menu.getBoundingClientRect();

        // Check if outside viewport
        if (parentBounds.left + menuBounds.width + padding >= window.innerWidth)
        {
            menu.style.left = (parentBounds.left + parentBounds.width - menuBounds.width - padding) + 'px';
        }
        else
        {
            menu.style.left = (parentBounds.left + padding) + 'px';
        }

        if (parentBounds.top + menuBounds.height + padding >= window.innerHeight)
        {
            menu.style.top = (parentBounds.top + parentBounds.height - menuBounds.height - padding) + 'px';
        }
        else
        {
            menu.style.top = (parentBounds.top + padding) + 'px';
        }
    },

});
