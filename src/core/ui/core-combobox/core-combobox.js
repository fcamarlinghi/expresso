
import CoreDropdown, { separator } from '../core-dropdown/core-dropdown.js';
import CEP from '../../CEP.js';
import './core-combobox.less';

export default CoreDropdown.extend({

    template: require('./core-combobox.html'),

    data: function ()
    {
        return {

            /**
             * Value of the search textbox.
             * @type String
             * @default ''
             */
            searchLabel: '',

            /**
             * Name of the property to use as option padding.
             * @type String
             * @default '__padding'
             */
            paddingkey: '__padding',

            /**
             * Name of the property to use as option visibility.
             * @type String
             * @default '__visible'
             */
            visiblekey: '__visible',

        };
    },

    searchHandle: null,

    oninit: function ()
    {
        this._super();

        this.search = this.search.bind(this);

        // NOTE: options might not be immediately available or might change,
        // so observe the array of options and the label
        this.observe('options', function (options)
        {
            // Make sure 'visible' flags are setup correctly
            var visiblekey = this.get('visiblekey');

            for (var i = 0; i < options.length; i++)
            {
                options[i][visiblekey] = true;
            }
        });

        this.observe('label', function (label)
        {
            // Update search box label
            if (this.searchbox)
            {
                this.searchbox.value = label;
            }
        }, { init: false });

        // When search query is updated, trigger a search. This is done on a short
        // timeout to avoid searches from taking place too frequently
        this.on('searchInput', function (event)
        {
            if (this.searchHandle !== null)
            {
                clearTimeout(this.searchHandle);
            }

            this.searchHandle = setTimeout(this.search, 50, true);
        });
    },

    cacheFieldElement: function ()
    {
        this._super();
        this.searchbox = this.find('input');
        this.searchbox.value = this.get('label');
    },

    search: function (searching)
    {
        // Reset any pending timeout
        if (this.searchHandle !== null)
        {
            clearTimeout(this.searchHandle);
            this.searchHandle = null;
        }

        // Evaluate query
        const query = this.searchbox.value.trim(),
            visiblekey = this.get('visiblekey'),
            options = this.get('options');

        if (!searching || query.length === 0)
        {
            // Show everything
            for (let i = 0; i < options.length; i++)
            {
                options[i][visiblekey] = true;
            }
        }
        else
        {
            // Filter out the results
            const labelkey = this.get('labelkey'),
                paddingkey = this.get('paddingkey');

            let regex = null;
            try
            {
                regex = new RegExp(query, 'gi');
            }
            catch (error)
            {
                // We'll fall back to a simple text search
            }

            let parents = [];

            for (let i = 0; i < options.length; i++)
            {
                let option = options[i];
                if (option[labelkey] !== separator)
                {
                    option[visiblekey] = regex ? (option[labelkey].search(regex) > -1) : (option[labelkey].indexOf(regex) > -1);
                }
                else
                {
                    option[visiblekey] = false;
                }

                // Remember the parents of this option so they get shown as-well
                if (parents.length === 0 || parents[parents.length - 1][paddingkey] < option[paddingkey])
                {
                    parents.push(option);
                }
                else
                {
                    parents.pop()
                }

                if (option[visiblekey])
                {
                    for (var j = 0; j < parents.length; j++)
                    {
                        parents[j][visiblekey] = true;
                    }
                }
            }
        }

        this.update();
    },

    onMenuOpen: function ()
    {
        this._super();
        this.searchbox.focus();
    },

    onMenuClosed: function ()
    {
        this._super();

        // Reset search and label
        this.search(false);
        this.searchbox.value = this.get('label');
        this.searchbox.blur();
    },

    addEventListeners: function ()
    {
        this._super();
        this.searchbox.addEventListener('keydown', this.eventRequestClose);
    },

    removeEventListeners: function ()
    {
        this._super();
        this.searchbox.removeEventListener('keydown', this.eventRequestClose);
    },

    eventRequestClose: function (event)
    {
        if (event)
        {
            if ((event.type === 'keydown' && (event.keyCode === 13 || event.keyCode === 27))
                || event.type === 'blur')
            {
                // Close and blur the search field on ENTER/ESC
                // or if clicking outside the panel
                this.closeMenu();
            }
            else if (event.type === 'click' && event.target !== this.searchbox)
            {
                // Close the dropdown on click, but only if it happened outside the search box
                // This way the dropdown is not closed if search box gains focus
                this.closeMenu();
            }
        }
    },

});
