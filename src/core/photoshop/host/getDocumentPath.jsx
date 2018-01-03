
var documentPath = '';

try
{
    if (params.documentId)
    {
        for (var i = 0, l = app.documents.length; i < l; i++)
        {
            if (app.documents[i].id === params.documentId)
            {
                documentPath = app.documents[i].fullName.fsName;
                break;
            }
        }
    }
    else
    {
        documentPath = app.activeDocument.fullName.fsName;
    }
}
catch (e) { }

documentPath;
