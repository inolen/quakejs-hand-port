var fs = require('fs');

function ReadFile(path, encoding, callback) {
	var binary = encoding === 'binary';

	if (binary) {
		fs.readFile(path.substring(3), function (err, data) {
			if (err) throw err;

			// Marshal the NodeBuffer into a new ArrayBuffer.
			var buffer = new ArrayBuffer(data.length);
			var view = new Uint8Array(buffer);
			for (var i = 0; i < data.length; ++i) {
				view[i] = data[i];
			}

			callback.apply(this, buffer);
		});

		return;
	}

	fs.readFile(path.substring(3), 'utf8', function (err, data) {
		if (err) throw err;
		callback.apply(this, data);
	});
}