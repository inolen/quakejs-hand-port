var localFs;
var localWhitelist = [
	'default.cfg'
];

// Cross-browser shim.
window.requestFileSystem = window.requestFileSystem || window.webkitRequestFileSystem;

/**
 * InitLocalFilesystem
 */
function InitLocalFs(callback, errorHandler) {
	if (localFs) {
		callback(localFs);
	}

	// Initialize a persistent 1 mb filesystem.
	window.webkitStorageInfo.requestQuota(PERSISTENT, 1024 * 1024, function (grantedBytes) {
		window.requestFileSystem(window.PERSISTENT, grantedBytes, function (fs) {
			localFs = fs;
			callback(fs);
		}, errorHandler);
	}, errorHandler);
}

/**
 * TranslateFsError
 */
function TranslateFsError(err) {
	switch (err.code) {
		case FileError.NOT_FOUND_ERR:
			return 'File or directory not found';
		case FileError.NOT_READABLE_ERR:
			return 'File or directory not readable';
		case FileError.PATH_EXISTS_ERR:
			return 'File or directory already exists';
		case FileError.TYPE_MISMATCH_ERR:
			return 'Invalid filetype';
		default:
			return 'Unknown Error';
	};
}

/**
 * ReadFile
 */
function ReadFile(path, encoding, callback) {
	var local = localWhitelist.indexOf(path) > -1;

	if (local) {
		ReadLocalFile(path, encoding, callback);
	} else {
		ReadRemoteFile(path, encoding, callback);
	}
}

/**
 * ReadLocalFile
 * TODO Accept different encodings.
 */
function ReadLocalFile(path, encoding, callback) {
	var errorHandler = function (err) {
		console.log('Couldn\'t read \'' + path + '\'', TranslateFsError(err));
		return callback(err);
	};

	InitLocalFs(function (fs) {
		fs.root.getFile(path, {}, function (fileEntry) {
			fileEntry.file(function(file) {
				var reader = new FileReader();

				reader.onabort = errorHandler;
				reader.onerror = errorHandler;

				reader.onloadend = function () {
					callback(null, this.result);
				};

				reader.readAsText(file);
			}, errorHandler);
		}, errorHandler);
	}, errorHandler);
}

/**
 * ReadRemoteFile
 */
function ReadRemoteFile(path, encoding, callback) {
	var binary = encoding === 'binary';

	var request = new XMLHttpRequest();
	request.open('GET', Q3W_BASE_FOLDER + '/' + path, true);

	if (binary) {
		request.setRequestHeader('Content-Type', 'application/octet-stream');
		request.responseType = 'arraybuffer';
	} else {
		request.setRequestHeader('Content-Type', 'text/plain');
	}

	request.addEventListener('load', function () {
		if (request.readyState !== 4 || request.status !== 200) {
			return callback(new Error('ReadFile received response code ' + request.readyState));
		}

		return callback(null, binary ? request.response : request.responseText);
	});
	request.send(null);
}

/**
 * WriteFile
 */
function WriteFile(path, data, encoding, callback) {
	var local = localWhitelist.indexOf(path) > -1;

	if (!local) {
		throw new Error('Browser can\'t write to remote files');
	}

	WriteLocalFile(path, data, encoding, callback);
}

/**
 * WriteLocalFile
 * TODO Accept different encodings.
 */
function WriteLocalFile(path, data, encoding, callback) {
	var errorHandler = function (err) {
		console.log('Couldn\'t write to \'' + path + '\'', TranslateFsError(err));
		return callback(err);
	};

	console.log('writing', path);

	InitLocalFs(function (fs) {
		fs.root.getFile(path, { create: true }, function (fileEntry) {
			fileEntry.createWriter(function (writer) {
				var b = new Blob([data], { type: 'text/plain' });
				writer.write(b);
			}, errorHandler);
		}, errorHandler);
	}, errorHandler);
}