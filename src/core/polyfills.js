
// String.startsWith
// Needed to support Photoshop CC 2015
// Source: https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/String/startsWith
if (!String.prototype.startsWith)
{
    String.prototype.startsWith = function (search, pos)
    {
        return this.substr(!pos || pos < 0 ? 0 : +pos, search.length) === search;
    };
}

// String.endsWith
// Needed to support Photoshop CC 2015
// Source: https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/String/endsWith
if (!String.prototype.endsWith)
{
    String.prototype.endsWith = function (search, this_len)
    {
        if (this_len === undefined || this_len > this.length)
        {
            this_len = this.length;
        }
        return this.substring(this_len - search.length, this_len) === search;
    };
}
