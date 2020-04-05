import Ractive from 'ractive';
import Extension from 'core/Extension.js';
import CEP from 'core/CEP.js';
import './settings-panel.less';

export default Ractive.extend({

    template: require('./settings-panel.html'),

    // Append to document body
    el: document.body,
    append: true,

    data: {

        settings: null,

        generalSettingsVisible: true,
        tgaSettingsVisible: true,

    },

    observer: null,

    oninit()
    {
        this._super();
        this.observer = this.observe('settings.*', (value, old, path) =>
        {
            let p = path.replace('settings.', '');
            Extension.get().settings.set(p, value);

        }, { init: false });
        this.reload();
    },

    reload()
    {
        this.observer.silence();
        this.set('settings', Extension.get().settings.all());
        this.observer.resume();
    },

    close()
    {
        CEP.closeExtension();
    },

});
