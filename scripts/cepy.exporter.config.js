
'use strict';

// Exporter info
const info = {
    version: '0.5.0',
    author: 'Francesco Camarlinghi',
    homepage: 'http://minifloppy.it/expresso',
};

// Exporter extension configuration
const config = Object.freeze({

    builds: {
        'exporter': {
            source: 'build/com.expresso.exporter',
            products: ['photoshop'],
            families: 'CC2015',
            bundle: {
                id: 'com.expresso.exporter',
            },
            extensions: [

                // Main panel
                {
                    version: info.version,
                    id: 'com.expresso.exporter.main',
                    name: 'Expresso Exporter',
                    author: info.author,
                    homepage: info.homepage,
                    description: 'Automatically export your textures to common file formats (TGA, PNG, JPG, PSD, TIFF) out of PSDs containing multiple texture maps.',
                    icons: {
                        light: {
                            normal: './exporter/icons/icon-light.png',
                            hover: './exporter/icons/icon-light-hover.png',
                            disabled: './exporter/icons/icon-light-disabled.png'
                        },
                        dark: {
                            normal: './exporter/icons/icon-dark.png',
                            hover: './exporter/icons/icon-dark-hover.png',
                            disabled: './exporter/icons/icon-dark-disabled.png'
                        },
                    },
                    size: {
                        normal: { width: 255, height: 300 },
                        min: { width: 255, height: 200 },
                        max: { width: 2200, height: 2200 },
                    },
                    mainPath: './exporter/main.html',
                    cefParameters: ['--enable-nodejs', '--mixed-context'],
                },

                // Settings dialog
                {
                    version: info.version,
                    id: 'com.expresso.exporter.settings',
                    name: 'Expresso Exporter - Settings',
                    author: info.author,
                    homepage: info.homepage,
                    type: 'ModalDialog',
                    lifecycle: {
                        events: ['com.expresso.exporter.settings.open'],
                    },
                    size: {
                        normal: { width: 300, height: 400 },
                        min: { width: 300, height: 400 },
                        max: { width: 300, height: 400 },
                    },
                    mainPath: './exporter/settings.html',
                    cefParameters: ['--enable-nodejs', '--mixed-context'],
                }
            ],
        },
    },

    packaging: {
        output: `release/expresso_exporter_${info.version}.zxp`,
        timestampURL: 'http://timestamp.digicert.com/',
        certificate: require('./distrib/cepy.certificate.js'),
    }
});

module.exports = config;
