var _ = require('underscore');
var http = require('http');
var WebSocketServer = require('websocket').server;

function main() {
	var cfg = loadConfig();
	launchServer(cfg.port);
}

function loadConfig() {
	var cfg = {
		port: 9003
	};
	try {
		var data = require('./master.json');
		_.extend(cfg, data);
	} catch (e) {
	}

	return cfg;
}

function launchServer(port) {
	var server = http.createServer();
	var wsServer = new WebSocketServer({
		httpServer: server,
		autoAcceptConnections: false
	});

	wsServer.on('request', function(request) {
		var connection = request.accept('quakejs', request.origin);
		console.log((new Date()), 'Connection accepted.');

		connection.on('message', function (message) {
			console.log('GOT A MESSAGE');
			var data = message.binaryData;
			var ab = new ArrayBuffer(data.length);
			var view = new Uint8Array(ab);
			for (var i = 0; i < data.length; ++i) {
				view[i] = data[i];
			}

			console.log(ab);
		});
	});

	server.listen(port, function() {
		console.log('Master server is now listening on port', port);
	});
}

main();