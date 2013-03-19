var CORS = require('connect-xcors');
var ejs = require('ejs');
var express = require('express');
var fs = require('fs');
var http = require('http');
var opt = require('optimist');
var path = require('path');
var url = require('url');
var AssetMap = require('./asset-map');

var argv = require('optimist')
	.describe('config', 'Location of the configuration file').default('config', './content.json')
	.argv;

if (argv.h || argv.help) {
	opt.showHelp();
	return;
}

function main() {
	var config = loadConfig();

	//
	// Setup the express app.
	//
	var app = express();

	app.locals.assets = new AssetMap(path.join(__dirname, 'assets'));

	app.use(express.compress());
	// Allow cross-domain requests on our content.
	app.use(CORS());
	app.use(function (req, res, next) {
		res.locals.assets = app.locals.assets;
		next();
	});

	app.get('/assets/scripts/all.shader', handleAllShader);
	app.get('/assets/*', handleStaticAsset);
	app.get('/bin/*.js', handleDynamicAsset);
	app.get('/lib/*.css', handleDynamicAsset);
	app.get('/lib/*.js', handleDynamicAsset);
	app.get('/lib/*.tpl', handleDynamicAsset);

	//
	// Create the HTTP server.
	//
	var server = http.createServer(app);

	server.listen(config.port, function () {
		console.log('Content server is now listening on port', server.address().address, server.address().port);
	});

	return server;
}

function loadConfig() {
	var config = {
		port: 9000
	};
	try {
		console.log('Loading config file from ' + argv.config + '..');
		var data = require(argv.config);
		_.extend(config, data);
	} catch (e) {
	}

	return config;
}

function handleAllShader(req, res, next) {
	var i = 0;
	var buffer = '';
	var shaders = res.locals.assets.find(/scripts[\\\/][^\.]+\.shader/);
	var readComplete = function (err, data) {
		// If there was an error, continue down the middleware stack.
		if (err) return next(err);

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

function handleStaticAsset(req, res, next) {
	var relativePath = req.params[0];
	var absolutePath = res.locals.assets.find(relativePath);

	console.log('Serving asset', relativePath, 'from', absolutePath);

	res.sendfile(absolutePath, function (err) {
		if (err) return next(err);
	});
}

function handleDynamicAsset(req, res, next) {
	var parsed = url.parse(req.url);
	var absolutePath = __dirname + parsed.pathname;

	res.sendfile(absolutePath, function (err) {
		if (!err) {
			return;
		}

		// If sendfile failed, maybe there is an EJS script we just need to render.
		var ejsPath = absolutePath.replace('.js', '.ejs.js');

		fs.readFile(ejsPath, 'utf8', function (err, data) {
			if (err) return next(err);

			var output = ejs.render(data, { filename: ejsPath });
			res.send(output);
		});
	});
}

main();