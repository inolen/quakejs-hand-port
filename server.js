var http = require('http');
var httpProxy = require('http-proxy');
var express = require('express');
var includes = require('./build/includes.js');

/**
 * Load config
 */
var config = {
	port: 8080
};

function createAssetServer() {
	return require('./assets').createServer();
}

function createExampleServer(assetServer) {
	var app = express();
	var exampleServer = http.createServer(app);

	// Serve static example client files.
	app.use(express.static(__dirname + '/example'));

	// Pre-compiled binaries.
	app.use('/bin', express.static(__dirname + '/bin'));

	// Modules need to be pre-processed.
	app.get('/lib/*.js', function (req, res, next) {
		var scriptname = __dirname + req.url;
		var text = includes(scriptname);

		res.send(text);
	});

	// Proxy asset requests.
	var proxy = new httpProxy.RoutingProxy();
	var proxyOptions = {
		host: 'localhost',
		port: assetServer.address().port
	};

	proxy.on('proxyError', function (err, req, res) {
		console.error(err);
	});

	app.get('/assets/*', function (req, res, next) {
		proxy.proxyRequest(req, res, proxyOptions);
	});

	exampleServer.listen(config.port);
	console.log('Example server is now listening on port', config.port);
}

// Start assets server.
var assetServer = createAssetServer();

// Setup small server to host example client.
createExampleServer(assetServer);