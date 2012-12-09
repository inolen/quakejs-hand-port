var http = require('http');

/**
 * ReadFile
 */
function ReadFile(path, encoding, callback) {
	var binary = encoding === 'binary';

	// Since we're NOT in the browser, send the request
	// directly to the content server. FREEDOM!!!
	path = assetsUrl + '/assets/' + path;

	http.get(path, function (res) {
		res.on('close', function (err) {
			callback(err);
		});

		if (binary) {
			var length = res.headers['content-length'];
			var buffer = new Uint8Array(length);
			var index = 0;

			res.on('data', function (chunk) {
				for (var i = 0, l = chunk.length; i < l; i++) {
					buffer[index++] = chunk[i];
				}
			}).on('end', function () {
				callback(null, buffer);
			});
		} else {
			var str = '';
			res.on('data', function (chunk) {
				str += chunk;
			}).on('end', function () {
				callback(null, str);
			});
		}
	});
}