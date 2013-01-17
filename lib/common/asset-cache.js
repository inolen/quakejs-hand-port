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

/**
 * Register an object under a name.
 */
AssetCache.prototype.register = function (name, obj) {
	if (typeof(name) !== 'string') {
		obj = name;
		name = 'noname';
	}

	var asset = {
		name: name,
		obj: obj
	};

	this.assets.push(asset);
};

/**
 * Load and register a filename, returning
 * the handle to the callback.
 */
AssetCache.prototype.load = function () {
	var assets = this.assets;
	var args = Array.prototype.slice.call(arguments);
	var name = args[0];
	var callback = args[args.length - 1];

	if (assets.length < 1) {
		return callback(new Error('No default asset registered'));
	}

	// Wrap the callback in our own.
	args[args.length - 1] = function (obj, handle) {
		callback(handle);
	};

	this.findByName.apply(this, args);
};

/**
 * Find asset object by handle.
 */
AssetCache.prototype.findByHandle = function (handle) {
	var assets = this.assets;

	if (handle < 1 || handle >= assets.length) {
		return assets[0].obj;
	}

	return assets[handle].obj;
};

/**
 * Find asset object by name.
 */
AssetCache.prototype.findByName = function () {
	var assets = this.assets;
	var callbacks = this.callbacks;

	var args = Array.prototype.slice.call(arguments);
	var name = args[0];
	var callback = args[arguments.length - 1];

	// Search the currently loaded assets.
	for (var handle = 0; handle < assets.length; handle++) {
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

	// Wrap the callback in our own.
	args[args.length - 1] = function (err, obj) {
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

	this.trigger('load', args);
};

return AssetCache;

});