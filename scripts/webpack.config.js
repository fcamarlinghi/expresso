
'use strict';

const path = require('path'),
      extend = require('extend'),
      webpack = require('webpack'),
      ExtractTextPlugin = require('extract-text-webpack-plugin');

/**
 * Gets webpack configuration based on specified build mode.
 */
const getConfig = function (mode)
{
    let config = {

        target: 'node-webkit',

        output: {
            filename: '[name]/[name].js',
        },

        resolve: {
            alias: {
                'core': path.resolve('src/core/index.js'),
            },
        },

        module: {
            loaders: [
                { test: /\.js$/, loader: 'babel?presets[]=es2015', exclude: /(node_modules)/ },
                { test: /\.html$/, loader: path.resolve(__dirname, 'webpack.loader.ractive.js') },
                { test: /\.json$/, loader: 'json' },
                { test: /\.jsx$/, loader: path.resolve(__dirname, 'webpack.loader.jsx.js') },
                { test: /\.fx$/, loader: 'raw' },
                { test: /\.less$/, loader: ExtractTextPlugin.extract('css-loader?minimize!less-loader') }
            ],
        },

        plugins: [
            // NOTE: order matters! Plugin definitions might be overridden later on during the build process
            new webpack.DefinePlugin({}),
            new ExtractTextPlugin('[name]/[name].css'),
        ],

    };

    // Mode-based configuration
    if (mode === 'debug')
    {
        // Debug
        extend(true, config, {
            watch: true,
            debug: true,
            devtool: '#source-map',
        });

        config.plugins[0].definitions.RELEASE = false;
    }
    else
    {
        // Release
        config.plugins.push(new webpack.optimize.UglifyJsPlugin({

            compress: {
                screw_ie8: true,
                unsafe: true,
                dead_code: true,
            },

        }));

        config.plugins[0].definitions.RELEASE = true;
    }

    return config;
};

module.exports = {
    getConfig,
};
