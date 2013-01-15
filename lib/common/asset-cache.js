/**
 * Utility module for handling deferring callbacks when async
 * loading assets, as well as maintaining a pattern of always
 * returning a valid asset handle.
 */

define('common/asset-cache', ['EventEmitter'], function (EventEmitter) {

var AssetCache = function () {
	this.assets = [];
	this.callbacks = {};
};

AssetCache.prototype = new EventEmitter();
AssetCache.prototype.constructor = AssetCache;

AssetCache.prototype.registerDefault = function (obj) {
	this.assets[0] = { handle: 0, obj: obj };
};

AssetCache.prototype.register = function (name, callback) {
	var assets = this.assets;

	if (assets.length < 1) {
		return callback(new Error('No default asset registered'));
	}

	if (!name) {
		return callback(null, 0);
	}

	this.findByName(name, function (obj, handle) {
		callback(handle);
	});
};

AssetCache.prototype.findByHandle = function (handle) {
	var assets = this.assets;

	if (handle < 1 || handle >= assets.length) {
		return assets[0].obj;
	}

	return assets[handle].obj;
};

AssetCache.prototype.findByName = function (name, callback) {
	var assets = this.assets;
	var callbacks = this.callbacks;

	// Search the currently loaded assets.
	for (var handle = 1; handle < assets.length; handle++) {
		var asset = assets[handle];

		if (asset.name === name) {
			return callback(asset.obj, handle);
		}
	}

	// Append to the pending callback stack if it exists.
	if (callbacks[name]) {
		callbacks[name].push(callback);
		return;
	}

	// Initialize the callback stack.
	callbacks[name] = [callback];

	var loaded = function (err, obj) {
		var handle;
		var asset;

		if (err) {
			handle = 0;
			asset = assets[0];
		} else {
			handle = assets.length;
			asset = {
				name: name,
				obj: obj
			};
			assets.push(asset);
		}

		// Execute pending callbacks.
		var pending = callbacks[name];
		for (var i = 0; i < pending.length; i++) {
			pending[i](asset.obj, handle);
		}

		// Clear the callback stack.
		delete callbacks[name];
	};

	this.trigger('load', [name, loaded]);
};

return AssetCache;

});