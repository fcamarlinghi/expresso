//#!/usr/bin/env node

/* eslint-disable no-console */
'use strict';

if (process.argv.length < 4)
{
    console.log('Expresso Build Tool.\n\nUsage: build.js <task> <mode>');
}
else
{
    const taskName = process.argv[2],
          mode = process.argv[3];

    // Find target task file
    const task = require(`../scripts/tasks/${taskName}.js`);

    // Enable verbose output
    process.env.DEBUG = 'cepy';

    // And run it with the specified mode
    task.run(mode)
        .then(process.exit)
        .catch(err =>
        {
            console.error(err);
            process.exit(1);
        });
}
