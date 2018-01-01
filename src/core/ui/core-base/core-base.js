
import Ractive from 'ractive';

export default Ractive.extend({
        
    lazy: true,

    twoway: false,

    isolated: true,

    data: {

        /**
         * Class names.
         * @type String
         * @default null
         */
        css: null,

        /**
         * Component instance style.
         * @type String
         * @default null
         */
        style: null,

    },

});
