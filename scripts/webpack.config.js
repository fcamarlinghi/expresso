
'use strict';

const path = require('path'),
    extend = require('extend'),
    webpack = require('webpack'),
    ExtractTextPlugin = require('extract-text-webpack-plugin');

/**
 * Gets webpack configuration based on specified build mode.
 */
const getConfig = function (mode, folder)
{
    let config = {

        target: 'node-webkit',

        output: {
            filename: folder + '/[name].js',
            publicPath: folder + '/',
        },

        resolve: {
            alias: {
                'core': path.resolve('src/core'),
                'photoshop': path.resolve('src/photoshop'),
                'ractive': 'ractive/runtime.js',
            },
        },

        module: {
            rules: [
                { test: /\.js$/, use: 'babel-loader', exclude: /(node_modules)/ },
                { test: /\.html$/, use: path.resolve(__dirname, 'webpack.loader.ractive.js') },
                { test: /\.jsx$/, use: path.resolve(__dirname, 'webpack.loader.jsx.js') },
                { test: /\.fx$/, use: 'raw-loader' },
                { test: /\.less$/, use: ExtractTextPlugin.extract(['css-loader?minimize', 'less-loader']) }
            ],
        },

        plugins: [
            // NOTE: order matters! Plugin definitions might be overridden later on during the build process
            new webpack.DefinePlugin({}),
            new ExtractTextPlugin(folder + '/[name].css'),
            new webpack.ProvidePlugin({ Promise: 'bluebird' }),
        ],

    };

    // Mode-based configuration
    if (mode === 'debug')
    {
        // Debug
        extend(true, config, {
            watch: true,
            devtool: 'source-map',
        });

        config.plugins[0].definitions.RELEASE = false;
        config.plugins.push(new webpack.LoaderOptionsPlugin({ debug: true })); // REVIEW: useful?
    }
    else
    {
        // Release
        config.plugins[0].definitions.RELEASE = true;

        config.plugins.push(new webpack.optimize.UglifyJsPlugin({

            compress: {
                screw_ie8: true,
                unsafe: true,
                dead_code: true,
            },

        }));
    }

    return config;
};

module.exports = {
    getConfig,
};
