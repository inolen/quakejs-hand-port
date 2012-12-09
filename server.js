var http = require('http');
var express = require('express');

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

	// Proxy content requests.
	app.get('/bin/*', proxyContentRequest);
	app.get('/lib/*', proxyContentRequest);
	app.get('/assets/*', proxyContentRequest);

	exampleServer.listen(config.port);
	console.log('Example server is now listening on port', config.port);
}

function proxyContentRequest(req, res, next) {
	var proxyHost = 'localhost';
	var proxyPort = assetServer.address().port;

	var preq = http.request({
		host: proxyHost,
		port: proxyPort,
		path: req.url,
		method: req.method,
		headers: req.headers
	}, function (pres) {
		res.writeHead(pres.statusCode, pres.headers);
		pres.pipe(res);
	});
	req.pipe(preq);
}

// Start assets server.
var assetServer = createAssetServer();

// Setup small server to host example client.
createExampleServer(assetServer);