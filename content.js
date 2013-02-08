var express = require('express');
var fs = require('fs');
var http = require('http');
var includes = require('./build/includes.js');
var opt = require('optimist');
var path = require('path');
var url = require('url');

var argv = opt
	.describe('port', 'Port to bind to').default('port', 9000)
	.argv;

if (argv.h || argv.help) {
	opt.showHelp();
	return;
}

function main() {
	createServer(argv.port);
}

function createServer(port) {
	var app = express();

	app.locals.assets = new AssetMap(__dirname + '/assets');

	app.use(express.compress());
	app.use(function (req, res, next) {
		res.locals.assets = app.locals.assets;
		next();
	});
	app.get('/bin/*.js', handleBinary);
	app.get('/lib/*.js', handleLibrary);
	app.get('/assets/scripts/all.shader', handleAllShader);
	app.get('/assets/*', handleAsset);

	var server = http.createServer(app);
	server.listen(port);
	console.log('Content server is now listening on port', port);

	return server;
}

function handleBinary(req, res, next) {
	var parsed = url.parse(req.url);
	var absolutePath = __dirname + parsed.pathname;

	res.sendfile(absolutePath, function (err) {
		if (err) return next(err);
	});
}

function handleLibrary(req, res, next) {
	var parsed = url.parse(req.url);
	var absolutePath = __dirname + parsed.pathname;

	fs.stat(absolutePath, function (err, stat) {
		if (err) return next(err);
		var text = includes(absolutePath);

		res.send(text);
	});
}

function handleAllShader(req, res, next) {
	getAllShaders(res.locals.assets, function (err, shaders) {
		if (err) return next(err);

		res.send(shaders);
	});
}

function getAllShaders(assets, callback) {
	var i = 0;
	var buffer = '';
	var shaders = assets.findPaths(/scripts\/[^\.]+\.shader/);

	var readComplete = function (err, data) {
		// If there was an error, throw a 500.
		if (err) return callback(err);

		buffer += data + '\n';

		if (i < shaders.length) {
			// Read the next file.
			fs.readFile(shaders[i++], readComplete);
		} else {
			// We've read them all.
			callback(null, buffer);
		}
	};

	fs.readFile(shaders[i++], readComplete);
}

function handleAsset(req, res, next) {
	var relativePath = req.params[0];
	var absolutePath = res.locals.assets.getPath(relativePath);

	console.log('Serving asset', relativePath, 'from', absolutePath);

	res.sendfile(absolutePath, function (err) {
		if (err) return next(err);
	});
}

/**
 * Helper object to map relative file paths to their correct
 * location in the assets directory, properly honoring overrides.
 */
function AssetMap(root) {
	this.root = root;
	this.map = {};

	this.refresh();
}

AssetMap.prototype.refresh = function () {
	var self = this;

	// Find all the subdirectories of root.
	var subdirs = [];

	var filenames = fs.readdirSync(this.root);
	filenames.forEach(function (file) {
		file = self.root + '/' + file;

		var stat = fs.statSync(file);

		if (stat.isDirectory()) {
			subdirs.push(file + '/built');
		}
	});

	// Order them alphabetically as we want
	// reverse alphabetical precedence.
	subdirs.sort();

	// Populate the cache with their contents.
	var populate_r = function (subRoot, path) {
		var filenames = fs.readdirSync(path);
		filenames.forEach(function (file) {
			file = path + '/' + file;

			var stat = fs.statSync(file);

			if (stat.isDirectory()) {
				populate_r(subRoot, file);
			} else if (stat.isFile()) {
				var relativePath = file.replace(subRoot + '/', '');
				self.map[relativePath] = file;
			}
		});
	};

	subdirs.forEach(function (path) {
		console.log('Loading', path);
		populate_r(path, path);
	});
};

AssetMap.prototype.getPath = function (relativePath) {
	// Return the original path if the lookup failed.
	return (this.map[relativePath] || relativePath);
};

AssetMap.prototype.findPaths = function (filter) {
	var map = this.map;
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
};

/**
 * If we're being execute directly, spawn server,
 * otherwise setup our exports.
 */
if (module.parent === null) {
	main();
}

module.exports = {
	createServer: createServer
};