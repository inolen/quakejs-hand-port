var fs = require('fs');

/**
 * ReadFile
 */
function ReadFile(path, encoding, callback) {
	var binary = encoding === 'binary';

	if (binary) {
		fs.readFile('public/' + sh.BASE_FOLDER + '/' + path, function (err, data) {
			if (err) return callback(err);

			// Marshal the NodeBuffer into a new ArrayBuffer.
			var buffer = new ArrayBuffer(data.length);
			var view = new Uint8Array(buffer);
			for (var i = 0; i < data.length; ++i) {
				view[i] = data[i];
			}

			callback(null, buffer);
		});

		return;
	}

	fs.readFile('public/' + sh.BASE_FOLDER + '/' + path, 'utf8', function (err, data) {
		if (err) return callback(err);
		callback(null, data);
	});
}