var fs = require('fs');
var http = require('http');

/**
 * ReadLocalFile
 */
function ReadLocalFile(path, encoding, callback) {
	fs.readFile(path, encoding, function (err, data) {
		if (err) {
			log(err);
			return callback(err);
		}

		return callback(null, data);
	});
}

/**
 * ReadRemoteFile
 */
function ReadRemoteFile(path, encoding, callback) {
	var binary = encoding === 'binary';

	var com_filecdn = Cvar.AddCvar('com_filecdn');
	path = com_filecdn.get() + '/assets/' + path + '?v=' + QS.GAME_VERSION;

	http.get(path, function (res) {
		if (res.statusCode !== 200) {
			return callback(new Error('Failed to read remote file at \'' + path + '\'. Invalid HTTP response code ' + res.statusCode));
		}

		if (binary) {
			var length = res.headers['content-length'];
			var buffer = new ArrayBuffer(length);
			var view = new Uint8Array(buffer);
			var index = 0;

			res.on('data', function (chunk) {
				for (var i = 0, l = chunk.length; i < l; i++) {
					view[index++] = chunk[i];
				}
			}).on('end', function (err) {
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
	}).on('error', function (err) {
		callback(new Error('Failed to read file: ' + path));
	});
}

/**
 * WriteLocalFile
 */
function WriteLocalFile(path, data, encoding, callback) {
	fs.writeFile(path, data, encoding, function (err) {
		if (err) {
			return callback(err);
		}

		return callback(null);
	});
}