var http = require('http');
var express = require('express');

var port = 8080;
var contentPort = 9000;

function main() {
	var contentServer = createContentServer(contentPort);
	createExampleServer(port, contentServer.address().address, contentServer.address().port);
}

function createContentServer(port) {
	return require('./content').createServer(port);
}

function createExampleServer(port, contentHost, contentPort) {
	var app = express();
	app.use(express.static(__dirname + '/example'));
	app.use(function (req, res, next) {
		res.locals.contentHost = contentHost;
		res.locals.contentPort = contentPort;
		next();
	});
	app.get('/bin/*', proxyContentRequest);
	app.get('/lib/*', proxyContentRequest);
	app.get('/assets/*', proxyContentRequest);

	var server = http.createServer(app);
	server.listen(port);
	console.log('Example server is now listening on port', port);

	return server;
}

function proxyContentRequest(req, res, next) {
	// Delete old host header so http.request() sets the correct new one.
	// https://github.com/joyent/node/blob/master/lib/http.js#L1194
	delete req.headers['host'];

	var preq = http.request({
		host: res.locals.contentHost,
		port: res.locals.contentPort,
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

main();