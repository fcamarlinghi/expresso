
'use strict';

// Exporter version
const version = '0.5.0';

// Exporter extension configuration
const config = Object.freeze({

    builds: {
        'exporter': {
            source: 'build/exporter',
            products: ['photoshop'],
            families: ['CC2015'],
            bundle: {
                id: 'com.expresso.exporter',
            },
            extensions: [{
                version: version,
                id: 'com.expresso.exporter.main',
                name: 'Expresso Exporter',
                author: 'Francesco Camarlinghi',
                homepage: 'http://minifloppy.it/expresso',
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
                mainPath: './exporter/index.html',
                cefParameters: ['--enable-nodejs', '--mixed-context'],
            }],
        },
    },

    packaging: {
        output: `release/expresso_exporter_${version}.zxp`,
        timestampURL: 'http://timestamp.digicert.com/',
        certificate: require('./distrib/cepy.certificate.js'),
    }
});

module.exports = config;
