//@target photoshop
try
{
    app.bringToFront();

    // Load PlugPlug
    if (typeof ExternalObject.PlugPlugExternalObject !== 'object')
    {
        ExternalObject.PlugPlugExternalObject = new ExternalObject('lib:PlugPlugExternalObject');
    }

    // Trigger event
    const eventObj = new CSXSEvent(); 
    eventObj.type='com.expresso.exporter.exportAll'; 
    eventObj.data=''; 
    eventObj.dispatch();
}
catch (error) {}
finally
{
    // Unload PlugPlug
    if (typeof ExternalObject.AdobeXMPScript === 'object')
    {
        ExternalObject.AdobeXMPScript = undefined;
    }
}
