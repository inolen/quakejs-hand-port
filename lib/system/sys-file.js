// Proxies are namespaced callbacks used to enable modules
// to shutdown, preventing any pending callbacks from
// being executed.
var proxies = {};

/**
 * ToLocalPath
 */
function ToLocalPath(path) {
	if (!path.match(/~\//)) {
		return null;
	}

	return path.replace('~/', '');
}

/**
 * CancelFileCallbacks
 */
function CancelFileCallbacks(namespace) {
	var pending = proxies[namespace];

	if (!pending) {
		return;
	}

	for (var i = 0; i < pending.length; i++) {
		pending[i].active = false;
	}
}

/**
 * ProxyFileCallback
 */
function ProxyFileCallback(namespace, callback) {
	var fn = function () {
		if (!fn.active) {
			return;
		}

		return callback.apply(this, arguments);
	};

	fn.active = true;

	if (!proxies[namespace]) {
		proxies[namespace] = [];
	}

	proxies[namespace].push(fn);

	return fn;
}

/**
 * ReadFile
 */
function ReadFile(path, encoding, callback, namespace) {
	if (typeof(namespace) !== 'undefined') {
		callback = ProxyFileCallback(namespace, callback);
	}

	var localPath = ToLocalPath(path);

	if (localPath) {
		ReadLocalFile(localPath, encoding, callback);
	} else {
		ReadRemoteFile(path, encoding, callback);
	}
}

/**
 * WriteFile
 */
function WriteFile(path, data, encoding, callback, namespace) {
	if (typeof(namespace) !== 'undefined') {
		callback = ProxyFileCallback(namespace, callback);
	}

	var localPath = ToLocalPath(path);

	if (!localPath) {
		error('Can\'t write to remote files.');
		return;
	}

	WriteLocalFile(localPath, data, encoding, callback);
}