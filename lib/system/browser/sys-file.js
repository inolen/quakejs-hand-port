var localFs;

// Cross-browser shim.
window.storageInfo = window.storageInfo || window.webkitStorageInfo;
window.requestFileSystem = window.requestFileSystem || window.webkitRequestFileSystem;

/**
 * InitLocalFs
 */
function InitLocalFs(callback, errorHandler) {
	if (localFs) {
		return callback(localFs);
	}

	if (window.storageInfo === undefined ||
		window.requestFileSystem === undefined) {
		return errorHandler(new Error('Browser does not support FileSystem APIs'));
	}

	// Initialize a persistent 1 mb filesystem.
	window.storageInfo.requestQuota(window.PERSISTENT, 1024 * 1024, function (grantedBytes) {
		window.requestFileSystem(window.PERSISTENT, grantedBytes, function (fs) {
			localFs = fs;
			return callback(fs);
		}, errorHandler);
	}, errorHandler);
}

/**
 * ReadLocalFile
 * TODO Accept different encodings.
 */
function ReadLocalFile(filename, encoding, callback) {
	if (encoding !== 'utf8') {
		error('ReadLocalFile unsupported encoding \'' + encoding + '\'');
	}

	var errorHandler = function (err) {
		log('Couldn\'t read \'' + filename + '\'', err.message);
		return callback(err);
	};

	InitLocalFs(function (fs) {
		fs.root.getFile(filename, {}, function (fileEntry) {
			fileEntry.file(function(file) {
				var reader = new FileReader();

				reader.onabort = errorHandler;
				reader.onerror = errorHandler;

				reader.onloadend = function () {
					return callback(null, this.result);
				};

				reader.readAsText(file);
			}, errorHandler);
		}, errorHandler);
	}, errorHandler);
}

/**
 * ReadRemoteFile
 */
function ReadRemoteFile(filename, encoding, callback) {
	var binary = encoding === 'binary';

	var com_filecdn = Cvar.AddCvar('com_filecdn');
	filename = com_filecdn.get() + '/assets/' + filename + '?v=' + QS.GAME_VERSION;

	var request = new XMLHttpRequest();
	request.open('GET', filename, true);

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
 * WriteLocalFile
 * TODO Accept different encodings.
 */
function WriteLocalFile(filename, data, encoding, callback) {
	if (encoding !== 'utf8') {
		error('WriteLocalFile unsupported encoding \'' + encoding + '\'');
	}

	var errorHandler = function (err) {
		log('Couldn\'t write to \'' + filename + '\'', err.message);
		return callback(err);
	};

	InitLocalFs(function (fs) {
		fs.root.getFile(filename, { create: true }, function (fileEntry) {
			fileEntry.createWriter(function (writer) {
				var b = new Blob([data], { type: 'text/plain' });

				// This callback mess is absolutely terrible.
				// The point is to always truncate the file after writing, in
				// case the original file was larger. It'd be nice if getFile
				// supported this as an open flag.
				writer.onwriteend = function (e) {
					writer.onwriteend = function (e) {
						return callback(null);
					};

					writer.truncate(b.size);
				};

				writer.onerror = function (e) {
					return errorHandler(e);
				};

				writer.write(b);
			}, errorHandler);
		}, errorHandler);
	}, errorHandler);
}