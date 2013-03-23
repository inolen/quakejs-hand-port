var fs = require('fs');
var http = require('http');
var path = require('path');

/**
 * ReadLocalFile
 */
function ReadLocalFile(filename, encoding, callback) {
	// Load all local files from usr/ subdir.
	filename = path.join('usr', filename);

	fs.readFile(filename, encoding, function (err, data) {
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
function ReadRemoteFile(filename, encoding, callback) {
	var binary = encoding === 'binary';

	var com_filecdn = Cvar.AddCvar('com_filecdn');
	filename = com_filecdn.get() + '/assets/' + filename + '?v=' + QS.GAME_VERSION;

	http.get(filename, function (res) {
		if (res.statusCode !== 200) {
			return callback(new Error('Failed to read remote file at \'' + filename + '\'. Invalid HTTP response code ' + res.statusCode));
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
		callback(new Error('Failed to read file: ' + filename));
	});
}

/**
 * WriteLocalFile
 */
function WriteLocalFile(filename, data, encoding, callback) {
	// Load all local files from usr/ subdir.
	filename = path.join('usr', filename);

	fs.writeFile(filename, data, encoding, function (err) {
		if (err) {
			return callback(err);
		}

		return callback(null);
	});
}