
import './core-tooltip.less';

/** HTML element. */
let tip = document.createElement('div');
tip.setAttribute('class', 'core-tooltip');
tip.setAttribute('role', 'tooltip');
document.body.appendChild(tip);

/** Tooltip show timeout (in ms). */
export const timeout = 500;

export default function (node, content)
{
    /** Id of the last tooltip timeout. @private */
    let lastTimeoutId = null;

    /** Mutation observer for target element. @private */
    let targetObserver = null;

    /** Target mouse position. @private */
    let targetMousePos = { x: 0, y: 0 };

    /** Shows the tool tip for the specified element. @private */
    function show()
    {
        // Clear timeout id
        lastTimeoutId = null;

        // Show tooltip
        // Start with a single line tooltip
        tip.style.display = 'block';
        tip.style.whiteSpace = 'nowrap';
        tip.innerText = content;

        // Position the tooltip
        const targetBounds = node.getBoundingClientRect(),
            tipBounds = tip.getBoundingClientRect();

        let tipHeight = tipBounds.height,
            tipWidth = tipBounds.width;

        if (tipWidth > window.innerWidth / 2)
        {
            // Break to multiple lines if too long
            tip.style.whiteSpace = 'normal';
            tipWidth = window.innerWidth / 2;
        }

        let x = targetMousePos.x + window.scrollX + 15,
            y = targetBounds.top + targetBounds.height + window.scrollY;

        // Check if outside viewport
        if (x + tipWidth >= window.innerWidth)
        {
            const x2 = targetMousePos.x + window.scrollX - tipWidth - 5;

            if (x2 > 0)
            {
                x = x2;
            }
        }

        if (y + tipHeight >= window.innerHeight)
        {
            y = targetBounds.top + window.scrollY - tipHeight;
        }

        // Update position
        tip.style.left = `${x}px`;
        tip.style.top = `${y}px`;
    };

    /** Hides the tool tip for the specified element. @private */
    function hide()
    {
        node.removeEventListener('mousemove', handlers.mouseMoveHandler);
        targetObserver.disconnect();

        if (lastTimeoutId !== null)
        {
            clearTimeout(lastTimeoutId);
            lastTimeoutId = null;
        }
        else
        {
            tip.innerText = '';
            tip.style.display = 'none';
            tip.style.left = '0px';
            tip.style.top = '0px';
        }
    };

    let handlers = {

        /** Called when the mouse enters a tooltip enabled element. @private */
        mouseOverHandler: function (event)
        {
            // Do not show on active elements (i.e. textboxes, buttons) or disabled elements
            if (event.currentTarget.dataset && event.currentTarget.dataset.disabled === 'true'
                || event.currentTarget === document.activeElement
                || event.currentTarget.contains(document.activeElement))
            {
                return;
            }

            // No need to show empty tooltips
            if (typeof content !== 'string' || content.length === 0)
            {
                return;
            }

            // Set tooltip timeout
            targetMousePos.x = event.pageX;
            targetMousePos.y = event.pageY;
            lastTimeoutId = setTimeout(show, timeout);

            // Register mouse movement while waiting to show the tooltip
            if (timeout > 100)
            {
                node.addEventListener('mousemove', handlers.mouseMoveHandler);
            }

            // Start observing the target element for DOM changes
            // Useful when the element is hidden/moved while the tooltip is visible or waiting to be shown
            targetObserver.observe(event.currentTarget, { attributes: true, subtree: true });
        },

        /** Called when the mouse exits a tooltip enabled element. @private */
        mouseOutHandler: function (event)
        {
            // Reset tooltip
            hide();
        },

        /** Called when the mouse clicks a tooltip enabled element. @private */
        clickHandler: function (event)
        {
            // Reset active element after click so that tooltip is shown again if needed
            if (event.currentTarget === document.activeElement
                && (event.currentTarget.tagName.toLowerCase() === 'button'
                    || (event.currentTarget.tagName.toLowerCase() === 'input' && event.currentTarget.getAttribute('type').toLowerCase() === 'submit')))
            {
                document.activeElement.blur();
            }

            // Reset tooltip
            hide();
        },

        /** Called when the mouse moves while a tooltip is waiting to be shown. @private */
        mouseMoveHandler: function (event)
        {
            targetMousePos.x = event.pageX;
            targetMousePos.y = event.pageY;
        },

        /** Called when the element has mutated. @private */
        mutatedHandler: function (mutations, observer)
        {
            // Reset tooltip
            hide();
        },
    };

    // Setup
    node.addEventListener('mouseover', handlers.mouseOverHandler);
    node.addEventListener('mouseout', handlers.mouseOutHandler);
    node.addEventListener('click', handlers.clickHandler);
    targetObserver = new MutationObserver(handlers.mutatedHandler);

    return {
        teardown: function ()
        {
            hide();
            node.removeEventListener('mouseover', handlers.mouseOverHandler);
            node.removeEventListener('mouseout', handlers.mouseOutHandler);
            node.removeEventListener('click', handlers.clickHandler);
        }
    };
};
