
require('./core-tooltip.less');

/** HTML element. */
let tip = document.createElement('div');
tip.setAttribute('class', 'core-tooltip');
tip.setAttribute('role', 'tooltip');
document.body.appendChild(tip);

const decorator = function (node, content)
{
    /** Gets the tooltip text for this node. */
    function getTooltipText()
    {
        return node.tooltip || node.getAttribute('tooltip') || content;
    };

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
        tip.innerText = getTooltipText();

        // Position the tooltip
        let targetBounds = node.getBoundingClientRect(),
            tipBounds = tip.getBoundingClientRect();

        if (tipBounds.width > window.innerWidth / 2)
        {
            // Break to multiple lines if too long
            tip.style.whiteSpace = 'normal';
            tipBounds.width = window.innerWidth / 2;
        }

        let x = targetMousePos.x + window.scrollX + 15,
            y = targetBounds.top + targetBounds.height + window.scrollY;

        // Check if outside viewport
        if (x + tipBounds.width >= window.innerWidth)
        {
            const x2 = targetMousePos.x + window.scrollX - tipBounds.width - 5;

            if (x2 > 0)
            {
                x = x2;
            }
        }

        if (y + tipBounds.height >= window.innerHeight)
        {
            y = targetBounds.top + window.scrollY - tipBounds.height;
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
            const text = getTooltipText();
            if (typeof text !== 'string' || text.length === 0)
            {
                return;
            }

            // Set tooltip timeout
            targetMousePos.x = event.pageX;
            targetMousePos.y = event.pageY;
            lastTimeoutId = setTimeout(show, decorator.timeout);

            // Register mouse movement while waiting to show the tooltip
            if (decorator.timeout > 100)
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

/** Tooltip show timeout (in ms). */
decorator.timeout = 500;

module.exports = decorator;
