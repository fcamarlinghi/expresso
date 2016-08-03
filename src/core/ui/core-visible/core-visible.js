
require('./core-visible.less');

var decorator = function (node, content)
{
    node.classList.toggle('core-hidden', !Boolean.toBoolean(content));

    return {
        teardown: function ()
        {
            node.classList.remove('core-hidden');
        }
    }
};

module.exports = decorator;
