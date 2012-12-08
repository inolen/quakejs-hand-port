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
};

function getAbsolutePath(relativePath) {
	// Return the original path if the lookup failed.
	return (assetMap[relativePath] || relativePath);
};

/**
 * Create HTTP server to serve assets.
 */
function createServer() {
	// Initialize the asset map.
	refreshAssetMap();

	// Create the HTTP server.
	var app = express();
	var server = http.createServer(app);

	app.use(express.compress());

	// Static files for the web page.
	app.use(express.static(__dirname + '/public'));

	// Pre-compiled binaries.
	app.use('/bin', express.static(__dirname + '/bin'));

	// Static asset files.
	app.get('/assets/*', function (req, res, next) {
		var relativePath = req.params[0];
		var physicalPath = getAbsolutePath(relativePath);

		res.sendfile(physicalPath);
	});

	// Source JS files that need to be processed (for development only).
	app.get('/lib/*.js', function (req, res, next) {
		var scriptname = path.normalize(__dirname + req.url);
		var text = includes(scriptname);

		res.send(text);
	});

	server.listen(config.assetPort);
	
	console.log('Server is now listening on port', config.assetPort);
}

/**
 * If we're being execute directly, spawn server,
 * otherwise setup our exports.
 */
if (module.parent === null) {
	createServer();
}

module.exports = {
	getAbsolutePath: function (path) {
		return getAbsolutePath(path);
	},
	createServer: createServer
};