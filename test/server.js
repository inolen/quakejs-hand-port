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
	return require('../content').createServer(port);
}

function createExampleServer(port, contentHost, contentPort) {
	var app = express();

	app.locals.proxy = new httpProxy.RoutingProxy();

	app.use(express.static(__dirname));

	var server = http.createServer(app);
	server.listen(port, function () {
		console.log('Example server is now listening on port', server.address().address, server.address().port);
	});

	return server;
}

main();