
var newColor = null,
    baseColor = params.baseColor;

try
{
    if (typeof baseColor === 'string' && baseColor.length === 7)
    {
        // Remove trailing hash
        baseColor = baseColor.substring(1);
    }
    else
    {
        baseColor = '666666';
    }

    // Save old foreground color
    const oldColor = app.foregroundColor.rgb.hexValue;

    // Set base color as foreground color
    app.foregroundColor.rgb.hexValue = baseColor;

    if (app.showColorPicker())
    {
        newColor = app.foregroundColor.rgb.hexValue;
    }
    else
    {
        newColor = baseColor;
    }

    // Reset old foreground color
    app.foregroundColor.rgb.hexValue = oldColor;

    // Return color
    '#' + newColor;
}
catch (e)
{
    'Error while selecting color: ' + e;
}
