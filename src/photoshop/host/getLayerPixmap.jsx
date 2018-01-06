
var DEFAULT_MAX_DIMENSION = 10000,
	desc = new ActionDescriptor(),
    transform;

// Add a transform if necessary
if (params.inputRect && params.outputRect)
{
    transform = new ActionDescriptor();

    // The part of the document to use
    var inputRect = params.inputRect,
        psInputRect = new ActionList();

    psInputRect.putUnitDouble(charIDToTypeID('#Pxl'), inputRect.left);
    psInputRect.putUnitDouble(charIDToTypeID('#Pxl'), inputRect.top);

    psInputRect.putUnitDouble(charIDToTypeID('#Pxl'), inputRect.right);
    psInputRect.putUnitDouble(charIDToTypeID('#Pxl'), inputRect.bottom);

    transform.putList(stringIDToTypeID('rectangle'), psInputRect);

    // Where to move the four corners
    var outputRect = params.outputRect,
        psOutputCorners = new ActionList();

    psOutputCorners.putUnitDouble(charIDToTypeID('#Pxl'), outputRect.left);
    psOutputCorners.putUnitDouble(charIDToTypeID('#Pxl'), outputRect.top);

    psOutputCorners.putUnitDouble(charIDToTypeID('#Pxl'), outputRect.right);
    psOutputCorners.putUnitDouble(charIDToTypeID('#Pxl'), outputRect.top);

    psOutputCorners.putUnitDouble(charIDToTypeID('#Pxl'), outputRect.right);
    psOutputCorners.putUnitDouble(charIDToTypeID('#Pxl'), outputRect.bottom);

    psOutputCorners.putUnitDouble(charIDToTypeID('#Pxl'), outputRect.left);
    psOutputCorners.putUnitDouble(charIDToTypeID('#Pxl'), outputRect.bottom);

    transform.putList(stringIDToTypeID('quadrilateral'), psOutputCorners);

    // Absolute scaling may not keep the aspect ratio intact, in which case effects
    // cannot be scaled. To be consistent, turn it off for all of absolute scaling
    // transform.putBoolean(stringIDToTypeID('scaleStyles'), false);
}
else if (params.scaleX && params.scaleY && (params.scaleX !== 1 || params.scaleY !== 1))
{
    transform = new ActionDescriptor();
    transform.putBoolean(stringIDToTypeID('forceDumbScaling'), !params.useSmartScaling);
    transform.putDouble(stringIDToTypeID('width'), params.scaleX * 100);
    transform.putDouble(stringIDToTypeID('height'), params.scaleY * 100);
}

if (transform)
{
    // Interpolation and scaling options are only relevant in cases where a transform
    // is going to happen. So, we only bother to set them if we're actually going
    // to add a transform descriptor
    transform.putBoolean(stringIDToTypeID('forceDumbScaling'), !params.useSmartScaling);

    if (params.hasOwnProperty('interpolationType'))
    {
        transform.putEnumerated(stringIDToTypeID('interpolation'), stringIDToTypeID('interpolationType'), stringIDToTypeID(params.interpolationType));
        desc.putEnumerated(stringIDToTypeID('interpolation'), stringIDToTypeID('interpolationType'), stringIDToTypeID(params.interpolationType));
    }

    transform.putBoolean(stringIDToTypeID('forceSmartPSDPixelScaling'), !!params.forceSmartPSDPixelScaling);
    desc.putObject(stringIDToTypeID('transform'), stringIDToTypeID('transform'), transform);
}

desc.putInteger(stringIDToTypeID('documentID'), params.documentId);
desc.putInteger(stringIDToTypeID('width'), params.maxDimension || DEFAULT_MAX_DIMENSION);
desc.putInteger(stringIDToTypeID('height'), params.maxDimension || DEFAULT_MAX_DIMENSION);
desc.putInteger(stringIDToTypeID('format'), 2);

if (typeof (params.layerSpec) === 'object')
{
    desc.putInteger(stringIDToTypeID('firstLayer'), params.layerSpec.firstLayerIndex);
    desc.putInteger(stringIDToTypeID('lastLayer'), params.layerSpec.lastLayerIndex);

    if (params.layerSpec.hasOwnProperty('hidden') && params.layerSpec.hidden.length > 0)
    {
        var i,
            hiddenIndicesMap = {},
            settingsList = new ActionList(),
            hiddenLayerDesc = new ActionDescriptor(),
            visibleLayerDesc = new ActionDescriptor(),
            hiddenLayerSettings = new ActionDescriptor(),
            lsID = stringIDToTypeID('layerSettings');

        hiddenLayerSettings.putBoolean(stringIDToTypeID('enabled'), false);
        hiddenLayerDesc.putObject(lsID, lsID, hiddenLayerSettings);

        // We have to add a descriptor for every layer in order, so first
        // build a map to make it easier to do this.
        for (i = 0; i < params.layerSpec.hidden.length; i++)
        {
            hiddenIndicesMap[params.layerSpec.hidden[i]] = true;
        }

        // Loop over every layer, and add either a hidden or visible descriptor
        // based on the map we built.
        for (i = params.layerSpec.firstLayerIndex; i <= params.layerSpec.lastLayerIndex; i++)
        {
            if (hiddenIndicesMap[i])
            {
                settingsList.putObject(lsID, hiddenLayerDesc);
            }
            else
            {
                settingsList.putObject(lsID, visibleLayerDesc);
            }
        }

        desc.putList(stringIDToTypeID('layerSettings'), settingsList);
    }
}
else
{
    desc.putInteger(stringIDToTypeID('layerID'), params.layerSpec);
}

if (params.hasOwnProperty('compId'))
{
    desc.putInteger(stringIDToTypeID('compID'), params.compId);
}
else if (params.hasOwnProperty('compIndex'))
{
    desc.putInteger(stringIDToTypeID('compIndex'), params.compIndex);
}

if (params.includeAncestorMasks)
{
    desc.putEnumerated(stringIDToTypeID('includeAncestors'), stringIDToTypeID('includeLayers'), stringIDToTypeID('includeVisible'));
}
else
{
    desc.putEnumerated(stringIDToTypeID('includeAncestors'), stringIDToTypeID('includeLayers'), stringIDToTypeID('includeNone'));
}

if (params.includeAdjustors)
{
    desc.putEnumerated(stringIDToTypeID('includeAdjustors'), stringIDToTypeID('includeLayers'), stringIDToTypeID('includeVisible'));
}
else
{
    desc.putEnumerated(stringIDToTypeID('includeAdjustors'), stringIDToTypeID('includeLayers'), stringIDToTypeID('includeNone'));
}

desc.putBoolean(stringIDToTypeID('convertToWorkingRGBProfile'), !!params.convertToWorkingRGBProfile);

if (params.hasOwnProperty('useICCProfile'))
{
    desc.putString(stringIDToTypeID('useICCProfile'), params.useICCProfile);
}
desc.putBoolean(stringIDToTypeID('sendThumbnailProfile'), !!params.getICCProfileData);

desc.putBoolean(stringIDToTypeID('allowDither'), !!params.allowDither);
desc.putBoolean(stringIDToTypeID('useColorSettingsDither'), !!params.useColorSettingsDither);
desc.putBoolean(stringIDToTypeID('clipToDocumentBounds'), !!params.clipToDocumentBounds);
desc.putBoolean(stringIDToTypeID('boundsOnly'), !!params.boundsOnly);
desc.putBoolean(stringIDToTypeID('bounds'), !!params.bounds);

executeAction(stringIDToTypeID('sendLayerThumbnailToNetworkClient'), desc, DialogModes.NO);
