/* eslint-disable no-console */
'use strict';

const Promise = require('bluebird'),
    extend = require('extend'),
    path = require('path'),
    webpack = require('webpack'),
    cpy = require('cpy'),
    rimraf = Promise.promisify(require('rimraf'));

const run = function (mode)
{
    const cepyConfig = require('../cepy.exporter.config.js'),
        buildPath = path.resolve(cepyConfig.builds['exporter'].source),
        packager = require('cepy')(cepyConfig);

    return Promise.try(() =>
    {
        // Cleanup
        return rimraf(buildPath + '/*', { glob: { dot: true } });
    })
    .then(() =>
    {
        // Copy bundle files
        return cpy(['exporter/**/*.*', 'CSInterface*.js'], buildPath, { cwd: 'bundle/', parents: true });
    })
    .then(() =>
    {
        // Generate manifest and debug files
        if (mode === 'debug')
        {
            return packager.decorate('exporter', true);
        }
    })
    .then(() =>
    {
        // Build
        return new Promise((resolve, reject) =>
        {
            // Prepare webpack config
            let webpackConfig = require('../webpack.config.js').getConfig(mode, 'exporter');
            extend(true, webpackConfig, {

                output: {
                    path: buildPath,
                    library: 'Exporter',
                },

                entry: {
                    'exporter-main': './src/exporter-main/index.js',
                    'exporter-settings': './src/exporter-settings/index.js',
                },

                optimization: {
                    splitChunks: {
                        chunks: 'all',
                        name: 'exporter-core',
                        cacheGroups: {
                            vendor: false,
                        },
                    },
                },

            });

            extend(webpackConfig.plugins[0].definitions, {
                VERSION: JSON.stringify(cepyConfig.builds['exporter'].extensions[0].version),
                WEBSITE: JSON.stringify(cepyConfig.builds['exporter'].extensions[0].homepage),
            });

            // Run the compiler
            const compiler = webpack(webpackConfig),
                callback = (err, stats) =>
                {
                    if (err)
                    {
                        console.error(err.stack || err);
                        if (err.details)
                        {
                            console.error(err.details);
                        }

                        if (mode === 'release')
                        {
                            reject(err);
                        }
                    }
                    else
                    {
                        if (stats.hasErrors() || stats.hasWarnings())
                        {
                            const info = stats.toJson();
                            if (stats.hasErrors())
                            {
                                console.error(info.errors);
                            }
                            if (stats.hasWarnings())
                            {
                                console.warn(info.warnings);
                            }
                        }

                        console.log(stats.toString({
                            chunks: false,
                            colors: true,
                        }));
                        console.log('');

                        if (mode === 'release')
                        {
                            resolve();
                        }
                    }
                };

            if (mode === 'debug')
            {
                compiler.watch({}, callback);
            }
            else
            {
                compiler.run(callback);
            }
        });
    })
    .then(() =>
    {
        // Generate ZXP package
        if (mode === 'release')
        {
            return packager.pack();
        }
    });
};

module.exports = {
    run,
};
