var actionDescriptor = new ActionDescriptor();

actionDescriptor.putInteger(stringIDToTypeID('documentID'), params.documentId);
actionDescriptor.putInteger(stringIDToTypeID('layerID'), params.layerId);

executeAction(stringIDToTypeID('sendLayerShapeToNetworkClient'), actionDescriptor, DialogModes.NO);
