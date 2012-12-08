var express = require('express');
var fs = require('fs');
var http = require('http');
var path = require('path');

var gameRoot = __dirname;
var assetRoot = gameRoot + '/assets';
var assetCache = {};

var includes = require(gameRoot + '/build/includes.js');

function refreshAssetCache() {
	var subdirs = [];
	
	// Find all the asset subdirectories.
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
	var populate_r = function (root, path) {
		var filenames = fs.readdirSync(path);
		filenames.forEach(function (file) {
			file = path + '/' + file;

			var stat = fs.statSync(file);

			if (stat.isDirectory()) {
				populate_r(root, file);
			} else if (stat.isFile()) {
				var relativePath = file.replace(root + '/', '');
				assetCache[relativePath] = file;
			}
		});
	};

	subdirs.forEach(function (path) {
		console.log('Populate', path);
		populate_r(path, path);
	});
}

function locateAsset(relativePath) {
	return assetCache[relativePath];
}

function assetRequest(req, res, next) {
	var relativePath = req.params[0];
	var physicalPath = locateAsset(relativePath);

	if (!physicalPath) {
		return next();
	}

	return res.sendfile(physicalPath);
}

function main() {
	var app = express();
	var server = http.createServer(app);

	app.use(express.compress());

	// Static files for the web page.
	app.use(express.static(__dirname + '/public'));

	// Pre-compiled binaries.
	app.use('/bin', express.static(gameRoot + '/bin'));

	// Static asset files.
	app.get('/asset/*', assetRequest);

	// Source JS files that need to be processed.
	app.get('/lib/*.js', function (req, res, next) {
		var scriptname = path.normalize(gameRoot + req.url);
		var text = includes(scriptname);
		res.send(text);
	});

	// Go ahead and refresh our asset cache.
	refreshAssetCache();

	server.listen(9000);
	
	console.log('Server is now listening on port 9000');
}

main();