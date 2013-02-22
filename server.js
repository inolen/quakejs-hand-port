var http = require('http');
var httpProxy = require('http-proxy');
var express = require('express');

var port = 8080;
var contentPort = 9000;

function main() {
	createContentServer(contentPort);
	createExampleServer(port, 'localhost', contentPort);
}

function createContentServer(port) {
	return require('./content').createServer(port);
}

function createExampleServer(port, contentHost, contentPort) {
	var app = express();

	app.locals.proxy = new httpProxy.RoutingProxy();

	app.use(express.static(__dirname + '/example'));
	app.use(assetProxy(app.locals.proxy, contentHost, contentPort));

	var server = http.createServer(app);
	server.listen(port);
	console.log('Example server is now listening on port', server.address().address, server.address().port);

	return server;
}

function assetProxy(proxy, host, port) {
	return function (req, res, next) {
		if (req.url.indexOf('/assets/') !== 0 &&
			req.url.indexOf('/bin/') !== 0 &&
			req.url.indexOf('/lib/') !== 0) {
			return next();
		}

		console.log('Proxying request for', req.url, 'to', host, port);

		proxy.proxyRequest(req, res, {
			host: host,
			port: port
		});
	};
}

main();