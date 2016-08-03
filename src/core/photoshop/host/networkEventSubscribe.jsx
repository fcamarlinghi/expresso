// Built-in events
var netEvents = ['imageChanged', 'generatorMenuChanged', 'generatorDocActivated', 'foregroundColorChanged',
'backgroundColorChanged', 'activeViewChanged', 'newDocumentViewCreated', 'closedDocument',
'documentChanged', 'colorSettingsChanged', 'quickMaskStateChanged', 'toolChanged',
'workspaceChanged', 'Asrt', 'idle'];

function isNetEvent(event)
{
    for (var i = 0, l = netEvents.length; i < l; i++)
    {
        if (event === netEvents[i])
        {
            return true;
        }
    }

    return false;
};

var actionDescriptor = new ActionDescriptor();
actionDescriptor.putString(stringIDToTypeID('version'), '1.0.0');

for (var i = 0, l = params.events.length; i < l; i++)
{
    var event = params.events[i];

    if (event.length > 4 || isNetEvent(event))
    {
        actionDescriptor.putClass(stringIDToTypeID('eventIDAttr'), stringIDToTypeID(event));
    }
    else
    {
        actionDescriptor.putClass(stringIDToTypeID('eventIDAttr'), charIDToTypeID(event));
    }

    executeAction(stringIDToTypeID('networkEventSubscribe'), actionDescriptor, DialogModes.NO);
}
