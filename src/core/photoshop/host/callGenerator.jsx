var desc = new ActionDescriptor(); 
desc.putString(app.stringIDToTypeID('name'), params.menu);
desc.putString(app.stringIDToTypeID('data'), params.data);
executeAction(app.stringIDToTypeID('generateAssets'), desc, DialogModes.NO);
