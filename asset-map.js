var fs = require('fs');
var path = require('path');
var watch = require('watch');

function AssetMap(root) {
	var self = this;

	this.root = root;
	this.map = null;

	// Perform initial refresh.
	this._refresh();

	// Refresh on fs changes.
	var refreshDelay = 1000;
	var refreshTimeout = 0;

	var refresh = function () {
		clearTimeout(refreshTimeout);
		refreshTimeout = setTimeout(function () {
			self._refresh();
		}, refreshDelay);
	};

	watch.createMonitor(this.root, function (monitor) {
		monitor.on('created', function (f, stat) {
			refresh();
		});

		monitor.on('removed', function (f, stat) {
			refresh();
		});
	});
}

AssetMap.prototype._refresh = function () {
	var self = this;

	console.log('Refreshing asset map..');

	// Reset map.
	var map = this.map = {};

	// Find all the subdirectories of root.
	var subdirs = [];

	var filenames = fs.readdirSync(this.root);
	filenames.forEach(function (file) {
		file = path.join(self.root, file);

		// Ignore non-directories.
		var stat = fs.statSync(file);
		if (!stat.isDirectory()) {
			return;
		}

		// We only care about the built subdirectory of each.
		file = path.join(file, 'built');
		stat = fs.statSync(file);
		if (!stat.isDirectory()) {
			return;
		}

		subdirs.push(file);
	});

	// Sort subdirs alphabetically as we want
	// reverse alphabetical precedence.
	subdirs.sort();

	// Populate the cache with their contents.
	subdirs.forEach(function (dir) {
		console.log('Loading', dir);
		self._addDirectory(dir, dir);
	});
};

AssetMap.prototype._addDirectory = function (root, dirname) {
	var self = this;
	var filenames = fs.readdirSync(dirname);

	filenames.forEach(function (filename) {
		filename = path.join(dirname, filename);

		var stat = fs.statSync(filename);

		if (stat.isDirectory()) {
			self._addDirectory(root, filename);
		} else if (stat.isFile()) {
			self._addFile(root, filename);
		}
	});
};

AssetMap.prototype._addFile = function (root, filename) {
	var relative = filename.replace(root + path.sep, '').toLowerCase();
	this.map[relative] = filename;
};

AssetMap.prototype.find = function (filter) {
	var map = this.map;

	// If path is a regular expression, scan the map.
	if (filter instanceof RegExp) {
		var paths = [];

		for (var relativePath in map) {
			if (!map.hasOwnProperty(relativePath)) {
				continue;
			}

			if (relativePath.match(filter)) {
				paths.push(map[relativePath]);
			}
		}

		return paths;
	}

	// Return the original path if the lookup failed.
	return (map[filter] || filter);
};

module.exports = AssetMap;