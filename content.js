var _ = require('underscore');
var fs = require('fs');
var http = require('http');
var path = require('path');
var express = require('express');
var includes = require('./build/includes.js');

/**
 * Load config
 */
var config = {
	port: 9000
};
try {
	var data = require('./content.json');
	_.extend(config, data);
} catch (e) {
}

/**
 * Helper object to map relative file paths to their correct
 * location in the assets directory, properly honoring overrides.
 */
var assetMap = {};

function refreshAssetMap() {
	var assetRoot = __dirname + '/assets';

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
 * Create HTTP server to serve content.
 */
function createServer() {
	var app = express();

	var server = http.createServer(app);

	app.use(express.compress());

	app.get('/bin/*.js', handleBinary);
	app.get('/lib/*.js', handleLibrary);
	app.get('/assets/scripts/all.shader', handleAllShader);
	app.get('/assets/*', handleAsset);

	// Initialize the asset map.
	refreshAssetMap();

	server.listen(config.port);
	console.log('Asset server is now listening on port', config.port);

	return server;
}

function handleBinary(req, res, next) {
	var absolutePath = __dirname + req.url;
	
	res.sendfile(absolutePath, function (err) {
		if (err) return next(err);
	});
}

function handleLibrary(req, res, next) {
	var scriptname = __dirname + req.url;

	fs.stat(scriptname, function (err, stat) {
		if (err) return next(err);
		var text = includes(scriptname);
		res.send(text);
	});
}

function handleAllShader(req, res, next) {
	getAllShaders(function (err, shaders) {
		if (err) return next(err);
		res.send(shaders);
	});
}

function handleAsset(req, res, next) {
	var relativePath = req.params[0];
	var absolutePath = getAbsolutePath(relativePath);

	res.sendfile(absolutePath, function (err) {
		if (err) return next(err);
	});
}

function getAllShaders(callback) {
	var i = 0;
	var buffer = '';
	var shaders = findAbsolutePaths(/scripts\/[^\.]+\.shader/);

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

/**
 * If we're being execute directly, spawn server,
 * otherwise setup our exports.
 */
if (module.parent === null) {
	createServer();
}

module.exports = {
	createServer: createServer
};