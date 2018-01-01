
import CoreBase from '../core-base/core-base.js';
import './core-field.less';

export default CoreBase.extend({

    data: {

        /**
         * Tooltip for this field.
         * @type String
         * @default null
         */
        tooltip: null,

        /**
         * Field name.
         * @type String
         * @default null
         */
        name: null,

        /**
         * If true, this field cannot be focused and the user cannot change
         * its value.
         * @type Boolean
         * @default false
         */
        disabled: false,

        /**
         * Tabindex of this field.
         * @type String
         * @default null
         */
        tabindex: null,

    },

    oldTabindex: null,

    field: null,

    oninit: function ()
    {
        this._super();
        this.oldTabindex = this.get('tabindex');
        this.observe('disabled', this.updateTabIndex);
    },

    onrender: function ()
    {
        this._super();
        this.getField();
    },

    getField: function ()
    {
        this.field = this.find('input');
    },

    onunrender: function ()
    {
        this.field = null;
        this._super();
    },

    updateTabIndex: function ()
    {
        if (this.get('disabled'))
        {
            this.oldTabindex = this.get('tabindex');
            this.set('tabindex', null);
        }
        else
        {
            this.set('tabindex', this.oldTabindex);
            this.oldTabindex = null;
        }
    },

});
