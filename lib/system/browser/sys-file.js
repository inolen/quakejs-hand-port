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
function ReadLocalFile(path, encoding, callback) {
	var errorHandler = function (err) {
		log('Couldn\'t read \'' + path + '\'', err.message);
		return callback(err);
	};

	InitLocalFs(function (fs) {
		fs.root.getFile(path, {}, function (fileEntry) {
			fileEntry.file(function(file) {
				var reader = new FileReader();

				reader.onabort = errorHandler;
				reader.onerror = errorHandler;

				reader.onloadend = function () {
					if (callback) {
						return callback(null, this.result);
					}
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

	// Due to browser cross-domain restrictions, we can't prefix the
	// path with the content server host. Instead, we prefix the path
	// with 'asset/' and send them to the current domain, which in
	// turn forwards them to the correct content server.
	//
	// Also, cache bust the assets with the current game version.
	path = 'assets/' + path + '?v=' + QS.GAME_VERSION;

	var request = new XMLHttpRequest();
	request.open('GET', path, true);

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
function WriteLocalFile(path, data, encoding, callback) {
	var errorHandler = function (err) {
		log('Couldn\'t write to \'' + path + '\'', err.message);
		return callback(err);
	};

	InitLocalFs(function (fs) {
		fs.root.getFile(path, { create: true }, function (fileEntry) {
			fileEntry.createWriter(function (writer) {
				var b = new Blob([data], { type: 'text/plain' });

				writer.write(b);

				if (callback) {
					return callback(null);
				}
			}, errorHandler);
		}, errorHandler);
	}, errorHandler);
}