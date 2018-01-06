
import CEP from '../../CEP.js';
import { defaultLogger as logger } from '../../Extension.js';
import CoreField from '../core-field/core-field.js';

import host from './host.jsx';
import './core-colorbox.less';

/**
 * A custom color field that looks more like the Photoshop one.
 */
export default CoreField.extend({

    template: require('./core-colorbox.html'),

    twoway: true,

    data: {

        /**
         * Field value.
         * @type String
         * @default ''
         */
        value: '',

    },

    on: {

        colorClick: function ()
        {
            if (this.get('disabled'))
            {
                return;
            }

            this.set('disabled', true);

            // Open Photoshop color picker
            CEP.evalScript(host, { baseColor: this.get('value') }).then((color) =>
            {
                this.set('disabled', false);

                if (typeof color === 'string' && color.length === 7)
                {
                    this.set('value', color);
                }
                else
                {
                    throw new TypeError(`Invalid color: ${color}`);
                }

            }).catch((e) =>
            {
                logger.error('Error while opening color picker', e);
            });
        },

    },

    cacheFieldElement()
    {
        this.field = this.find('div');
    },

});
