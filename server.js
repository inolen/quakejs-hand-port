var http = require('http');
var express = require('express');

/**
 * Load config
 */
var config = {
	port: 8080
};

// Start content server to proxy to.
var contentServer = createContentServer();

// Setup small server to host example client.
var exampleServer = createExampleServer(contentServer);

function createContentServer() {
	return require('./content').createServer();
}

function createExampleServer() {
	var app = express();
	var server = http.createServer(app);

	// Serve static example client files.
	app.use(express.static(__dirname + '/example'));

	// Proxy content requests.
	app.get('/bin/*', proxyContentRequest);
	app.get('/lib/*', proxyContentRequest);
	app.get('/assets/*', proxyContentRequest);

	server.listen(config.port);
	console.log('Example server is now listening on port', config.port);

	return server;
}

function proxyContentRequest(req, res, next) {
	var proxyHost = 'localhost';
	var proxyPort = contentServer.address().port;
	
	// Delete old host header so http.request() sets the correct new one.
	// https://github.com/joyent/node/blob/master/lib/http.js#L1194
	delete req.headers['host'];

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

	preq.on('error', function (err) {
		return next(err);
	});

	req.pipe(preq);
}
