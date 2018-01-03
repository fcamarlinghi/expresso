var idNS = stringIDToTypeID('sendDocumentInfoToNetworkClient'),
	desc = new ActionDescriptor();
desc.putString(stringIDToTypeID('version'), '1.3.0');

for (var key in params.flags)
{
    if (params.flags.hasOwnProperty(key))
	{
        desc.putBoolean(stringIDToTypeID(key), params.flags[key]);
    }
}

if (params.documentId)
{
    desc.putInteger(stringIDToTypeID('documentID'), params.documentId);
}

executeAction(idNS, desc, DialogModes.NO);
