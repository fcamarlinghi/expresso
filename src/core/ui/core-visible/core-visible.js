
import './core-visible.less';

export default function (node, content)
{
    node.classList.toggle('core-hidden', !Boolean.toBoolean(content));

    return {
        teardown: function ()
        {
            node.classList.remove('core-hidden');
        }
    }
}
