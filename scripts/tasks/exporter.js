
'use strict';

const Promise = require('bluebird'),
      extend = require('extend'),
      path = require('path'),
      webpack = require('webpack'),
      cpy = require('cpy'),
      rimraf = Promise.promisify(require('rimraf'));

const buildPath = 'build/com.expresso.exporter';

const run = function (mode)
{
    const cepyConfig = require('../cepy.exporter.config.js');
    let packager = require('cepy')(cepyConfig);

    return Promise.resolve()
    .then(() =>
    {
        // Cleanup
        return rimraf(buildPath + '/*');
    })
    .then(() =>
    {
        // Copy bundle files
        return cpy(['exporter/**/*.*', 'CSInterface*.js'], path.resolve(buildPath), { cwd: 'bundle/', parents: true });
    })
    .then(() =>
    {
        // Generate manifest and debug files if needed
        if (mode === 'debug')
        {
            return packager.compile('exporter', path.resolve(buildPath), true);
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
                    path: path.resolve(buildPath),
                    library: 'Exporter',
                },

                entry: {
                    'exporter-main': './src/exporter-main/index.js',
                    'exporter-settings': './src/exporter-settings/index.js',
                },

            });

            extend(webpackConfig.plugins[0].definitions, {
                VERSION: JSON.stringify(cepyConfig.builds['exporter'].extensions[0].version),
                WEBSITE: JSON.stringify(cepyConfig.builds['exporter'].extensions[0].homepage),
            });

            webpackConfig.plugins.push(
                new webpack.optimize.CommonsChunkPlugin({
                    name: 'exporter-core',
                    filename: 'exporter/exporter-core.js',
                })
            );

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
        // Generate ZXP file if needed
        if (mode === 'release')
        {
            return packager.pack(false);
        }
    });
};

module.exports = {
    run,
};
