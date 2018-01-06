
import CoreBase from '../core-base/core-base.js';
import Extension from '../../Extension.js';
import './core-extension.less';

export default CoreBase.extend({

    template: require('./core-extension.html'),

    onconstruct()
    {
        this._super();
        this.extension = Extension.get();

        this.extension.on('busy', (details) =>
        {
            const throbber = this.findComponent('core-throbber');
            if (throbber)
            {
                throbber.set('visible', details.status);
                throbber.set('message', details.task);
            }
        });
    }

});
