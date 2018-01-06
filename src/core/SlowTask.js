
import { assert } from './assert.js';
import Extension from './Extension.js';

/**
 * The active slow task.
 * @type {String}
 */
let slowTask = null;

/**
 * A global slow task.
 */
export default class SlowTask
{

    /**
     * Gets the currently active slow task, if any.
     * @returns {SlowTask}
     */
    static get()
    {
        return slowTask;
    }

    /**
     * Gets whether there is an active slow task.
     * @returns {Boolean}
     */
    static isInProgress()
    {
        return (slowTask !== null);
    }

    /**
     * Creates a new slow task, ending the previous one (if any).
     * @param {String} message Initial message.
     */
    static start(message)
    {
        SlowTask.complete();
        slowTask = message;
        Extension.get().emit('busy', { status: true, task: slowTask });
    }

    /**
     * Signals that there's been progress with the active slow task.
     * @param {String} message Initial message.
     */
    static progress(message)
    {
        assert(slowTask !== null, 'No slow task is currently in progress.');
        slowTask = message;
        Extension.get().emit('busy', { status: true, task: slowTask });
    }

    /**
     * Completes the active slow task.
     */
    static complete()
    {
        if (slowTask !== null)
        {
            Extension.get().emit('busy', { status: false, task: slowTask });
            slowTask = null;
        }
    }

}
