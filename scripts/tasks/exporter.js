
'use strict';

const Promise = require('bluebird'),
      extend = require('extend'),
      path = require('path'),
      webpack = require('webpack'),
      cpy = require('cpy'),
      cepy = require('cepy'),
      rimraf = Promise.promisify(require('rimraf'));

const buildPath = 'build/exporter';

const run = function (mode)
{
    const cepyConfig = require('../cepy.exporter.config.js');
    let packager = cepy(cepyConfig);

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
            let webpackConfig = require('../webpack.config.js').getConfig(mode);
            extend(true, webpackConfig, {

                output: {
                    path: path.resolve(buildPath),
                    publicPath: buildPath + '/',
                    library: 'Exporter',
                },

                entry: {
                    exporter: path.resolve('src/exporter/index.js'),
                },

            });

            extend(webpackConfig.plugins[0].definitions, {
                VERSION: JSON.stringify(cepyConfig.builds['exporter'].extensions[0].version),
                WEBSITE: JSON.stringify(cepyConfig.builds['exporter'].extensions[0].homepage),
            });

            // Run the compiler
            let compiler = webpack(webpackConfig),
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
                        process.stdout.write(stats.toString('minimal'));
                        process.stdout.write('\n\n');

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
            return packager.release(false);
        }
    });
};

module.exports = {
    run,
};
