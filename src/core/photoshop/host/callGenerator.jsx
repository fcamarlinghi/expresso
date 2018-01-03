var desc = new ActionDescriptor(); 
desc.putString(stringIDToTypeID('name'), params.menu);
desc.putString(stringIDToTypeID('data'), params.data);
executeAction(stringIDToTypeID('generateAssets'), desc, DialogModes.NO);
