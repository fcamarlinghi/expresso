var i = 0,
	l = app.documents.length,
	ids = [];

for (; i < l; i++)
{
    ids.push(app.documents[i].id);
}

ids.join(':');
