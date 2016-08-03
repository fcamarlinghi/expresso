
if (app.documents.length)
{
    try
    {
        // Load XMP
        if (typeof ExternalObject.AdobeXMPScript !== 'object')
        {
            ExternalObject.AdobeXMPScript = new ExternalObject('lib:AdobeXMPScript');
        }

        // Load current XMP metadata
        var xmpData = new XMPMeta(app.activeDocument.xmpMetadata.rawData);

        // Make sure our namespace is registered
        XMPMeta.registerNamespace(params.namespace, params.prefix);

        // Add new data
        xmpData.setProperty(params.namespace, params.key, params.data);

        // Save to file
        app.activeDocument.xmpMetadata.rawData = xmpData.serialize();
    }
    catch (e)
    { }
    finally
    {
        // Unload XMP
        if (typeof ExternalObject.AdobeXMPScript === 'object')
            ExternalObject.AdobeXMPScript = undefined;
    }
}
