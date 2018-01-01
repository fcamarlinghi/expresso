
import CoreField from '../core-field/core-field.js';
import application from '../../framework/Application.js';
import './core-dropdown.less';

export const separator = '---';

export default CoreField.extend({

    template: require('./core-dropdown.html'),

    twoway: true,

    data: function ()
    {
        return {

            /**
             * Dropdown options.
             * @type Array
             * @default []
             */
            options: [],

            /**
             * Selected value.
             * @type Mixed
             * @default null
             */
            value: null,

            /**
             * If true, the dropdown is currently open.
             * @type Boolean
             * @default false
             */
            open: false,

            /**
             * Name of the property to use as option label.
             * @type String
             * @default 'label'
             */
            labelkey: 'label',

            /**
             * Name of the property to use as option data.
             * @type String
             * @default 'value'
             */
            valuekey: 'value',

        };
    },

    computed: {

        label: function ()
        {
            const value = this.get('value'),
                  options = this.get('options'),
                  labelkey = this.get('labelkey'),
                  index = this.valueToIndex(value);

            if (index > -1)
            {
                return options[index][labelkey];
            }
            else
            {
                return '';
            }
        },

    },

    menu: null,

    resizeHandle: null,

    oninit: function ()
    {
        this._super();

        // Bind functions
        this.eventRequestClose = this.eventRequestClose.bind(this);
        this.eventResizeThrottler = this.eventResizeThrottler.bind(this);
        this.select = this.select.bind(this);

        // Setup events
        this.on('openMenu', this.openMenu);
        this.on('select', this.select);
        this.on('menuOpen', this.onMenuOpen);
        this.on('menuClosed', this.onMenuClosed);

        // Observe changes to options
        this.observe('options', this.optionsChanged, { init: false });
    },

    getField: function ()
    {
        this.field = this.find('div.core-button-base');
        this.menu = this.findComponent('core-menu');
    },

    onunrender: function ()
    {
        this.removeEventListeners();
        this.menu = null;
        this._super();
    },

    openMenu: function ()
    {
        if (!this.get('disabled') && !this.get('open'))
        {
            this.set('open', true);
            this.fire('menuOpen');
        }
    },

    closeMenu: function ()
    {
        if (this.get('open'))
        {
            this.set('open', false);
            this.fire('menuClosed');
        }
    },

    onMenuOpen: function ()
    {
        // HACK: close any other menu that might be open by triggering a click on the document
        document.body.click();

        // Detect some events that might close the menu
        setTimeout((context) =>
        {
            context.addEventListeners();

        }, 0, this);

        this.updateDropdown();
    },

    onMenuClosed: function ()
    {
        this.removeEventListeners();
    },

    optionsChanged: function (newValue, oldValue)
    {
        const index = this.valueToIndex(this.get('value'));
        this.updateSelectedValue(index);
    },

    updateSelectedValue: function (index)
    {
        if (index > -1)
        {
            const valuekey = this.get('valuekey'),
                  option = this.get('options')[index];

            this.set('value', option[valuekey]);
        }
        else
        {
            this.set('value', null);
        }
    },

    select: function (event)
    {
        // FIXME: there is a bug in Ractive 0.7.3 that prevents us from simply doing: event.context.value
        const value = event.original.currentTarget.dataset['value'],
              index = this.valueToIndex(value);

        this.updateSelectedValue(index);
        this.closeMenu();
    },

    valueToIndex: function (value)
    {
        const labelkey = this.get('labelkey'),
              valuekey = this.get('valuekey'),
              options = this.get('options');

        let index = -1

        for (let i = 0; i < options.length; i++)
        {
            let option = options[i];

            // Filter out separators
            // WARNING: non-strict comparison is needed
            if (option[labelkey] !== separator && option[valuekey] == value)
            {
                index = i;
                break;
            }
        }

        if (index === -1 && options.length > 0)
        {
            // If index is invalid and we have options, fall back to first option
            index = 0;
        }

        return index;
    },

    addEventListeners: function ()
    {
        // Detect ENTER/ESC keys
        // FIXME: ESC doesn't work (is not intercepted correctly by CEP?)
        application.cep.registerKeyEventsInterest({ keyCode: 13 }, { keyCode: 27 });
        window.addEventListener('keydown', this.eventRequestClose);

        // Detect clicks, resize, blur
        window.addEventListener('click', this.eventRequestClose);
        window.addEventListener('resize', this.eventResizeThrottler);
        window.addEventListener('blur', this.eventRequestClose);
    },

    removeEventListeners: function ()
    {
        application.cep.unregisterKeyEventsInterest({ keyCode: 13 }, { keyCode: 27 });
        window.removeEventListener('keydown', this.eventRequestClose);

        window.removeEventListener('click', this.eventRequestClose);
        window.removeEventListener('resize', this.eventResizeThrottler);
        window.removeEventListener('blur', this.eventRequestClose);

        if (this.resizeHandle != null)
        {
            window.clearTimeout(this.resizeHandle);
        }
    },

    eventResizeThrottler: function (event)
    {
        if (this.resizeHandle === null)
        {
            this.resizeHandle = setTimeout((context) =>
            {
                context.resizeHandle = null;
                context.updateDropdown();

            }, 50, this);
        }
    },

    eventRequestClose: function (event)
    {
        if (event)
        {
            if (event.type === 'keydown' && event.keyCode !== 13 && event.key !== 27)
            {
                // If event was a keydown, only close on ENTER/ESC
                return;
            }
        }

        this.closeMenu();
    },

    updateDropdown: function ()
    {
        // Position the menu
        let menuNode = this.menu.find('div');

        // Make sure to remove any max height so we get valid menu bounds
        menuNode.style.maxHeight = '';

        const parentBounds = this.find('div').getBoundingClientRect(),
              menuBounds = menuNode.getBoundingClientRect();

        // Find out optimal menu size and location based on window size
        let left = parentBounds.left,
            top = 0,
            width = parentBounds.width,
            maxHeight = -1;

        if (parentBounds.bottom + menuBounds.height < window.innerHeight)
        {
            // Menu fits below the dropdown button
            top = parentBounds.bottom - 1;
        }
        else if (parentBounds.top - menuBounds.height > 0)
        {
            // Menu fits above the dropdown button
            top = parentBounds.top - menuBounds.height + 1;
        }
        else
        {
            // Menu does not fit anywhere, so put it below the dropdown button with a scrollbar
            top = parentBounds.bottom - 1;
            maxHeight = window.innerHeight - top;
        }

        // Apply style
        menuNode.style.left = left + 'px';
        menuNode.style.top = top + 'px';
        menuNode.style.width = width + 'px';

        if (maxHeight > 0)
        {
            menuNode.style.maxHeight = maxHeight + 'px';
        }
        else
        {
            menuNode.style.maxHeight = '';
        }
    },

});
