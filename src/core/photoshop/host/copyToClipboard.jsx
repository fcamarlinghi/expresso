var ktextToClipboardStr = stringIDToTypeID('textToClipboard'),
	keyTextData = charIDToTypeID('TxtD'),
	testStrDesc = new ActionDescriptor();
testStrDesc.putString(keyTextData, params.clipboard);
executeAction(ktextToClipboardStr, testStrDesc, DialogModes.NO);
