
var data = '';

if (app.documents.length)
{
    try
    {
        // Load XMP
        if (typeof ExternalObject.AdobeXMPScript !== 'object')
        {
            ExternalObject.AdobeXMPScript = new ExternalObject('lib:AdobeXMPScript');
        }

        // If our namaspace is registered in XMP data, get data as string
        var xmpData = new XMPMeta(app.activeDocument.xmpMetadata.rawData);

        if (XMPMeta.getNamespacePrefix(params.namespace))
        {
            if (xmpData.doesPropertyExist(params.namespace, params.key))
            {
                data = xmpData.getProperty(params.namespace, params.key).value;
            }
        }
    }
    catch (e)
    {}
    finally
    {
        // Unload XMP
        if (typeof ExternalObject.AdobeXMPScript === 'object')
            ExternalObject.AdobeXMPScript = undefined;
    }
}

data;
