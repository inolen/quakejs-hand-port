/**
 * Creates an HTTP server to serve assets for the game.
 */
var _ = require('underscore');
var fs = require('fs');
var http = require('http');
var path = require('path');
var express = require('express');
var includes = require('./build/includes.js');

var config = loadConfig('config.json');

function loadConfig(filename) {
	var defaults = {
		"assetPort": 9000
	};

	var data = '{}';
	try {
		data = fs.readFileSync(filename, 'utf8');
	} catch (e) {
	}

	var json = JSON.parse(data);

	return _.extend({}, defaults, json);
}

/**
 * Create HTTP server to serve assets.
 */
function createServer() {
	// Create the HTTP server.
	var app = express();
	var server = http.createServer(app);

	// Compress everything.
	app.use(express.compress());

	// Static files for the web page.
	app.use(express.static(__dirname + '/public'));

	// Special dynamic files.
	// app.get('/assets/maps/maps.json', mapsRequest);
	app.get('/assets/scripts/all.shader', allShadersRequest);

	// Static asset files.
	app.get('/assets/*', assetRequest);

	// Release mode, pre-compiled binaries.
	app.use('/bin', express.static(__dirname + '/bin'));

	// Debug mode, source JS files that need to be processed.
	app.get('/lib/*.js', moduleRequest);

	// Initialize the asset map.
	refreshAssetMap();

	// Start the server.
	server.listen(config.assetPort);

	console.log('Server is now listening on port', config.assetPort);
}

function assetRequest(req, res, next) {
	var relativePath = req.params[0];
	var physicalPath = getAbsolutePath(relativePath);

	res.sendfile(physicalPath);
}

function moduleRequest(req, res, next) {
	var scriptname = path.normalize(__dirname + req.url);
	var text = includes(scriptname);

	res.send(text);
}

// function mapRequest(req, res, next) {
// 	res.send({

// 	});
// }

function allShadersRequest(req, res, next) {
	var buffer = '';

	var i = 0;
	var shaders = findAbsolutePaths(/scripts\/[^\.]+\.shader/);

	var readComplete = function (err, data) {
		if (err) throw err;
		buffer += data + '\n';
	
		if (i < shaders.length) {
			// Read the next file.
			fs.readFile(shaders[i++], readComplete);
		} else {
			// We've read them all.
			res.send(buffer);
		}
	};

	fs.readFile(shaders[i++], readComplete);
}

/**
 * Helper object to map relative file paths to their correct
 * location in the assets directory, properly honoring overrides.
 */
var assetRoot = __dirname + '/assets';
var assetMap = {};

function refreshAssetMap() {
	// Find all the subdirectories of roots.
	var subdirs = [];

	var filenames = fs.readdirSync(assetRoot);
	filenames.forEach(function (file) {
		file = assetRoot + '/' + file;
		
		var stat = fs.statSync(file);

		if (stat.isDirectory()) {
			subdirs.push(file);
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
				assetMap[relativePath] = file;
			}
		});
	};

	subdirs.forEach(function (path) {
		console.log('Loading', path);
		populate_r(path, path);
	});
}

function getAbsolutePath(relativePath) {
	// Return the original path if the lookup failed.
	return (assetMap[relativePath] || relativePath);
}

function findAbsolutePaths(filter) {
	var paths = [];

	for (var relativePath in assetMap) {
		if (!assetMap.hasOwnProperty(relativePath)) {
			continue;
		}

		if (relativePath.match(filter)) {
			paths.push(assetMap[relativePath]);
		}
	}

	return paths;
}

/**
 * Small wrapper around fs to map paths using the asset map.
 */
var vfs = {
	readFile: function (path, encoding, callback) {
		path = assets.getAbsolutePath(path);

		if (typeof(encoding) === 'function') {
			callback = encoding;
			return fs.readFile(path, callback);
		}

		return fs.readFile(path, encoding, callback);
	}
};

/**
 * If we're being execute directly, spawn server,
 * otherwise setup our exports.
 */
if (module.parent === null) {
	createServer();
}

module.exports = {
	vfs: function () { return fs; },
	createServer: createServer
};