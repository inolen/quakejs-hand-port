var _ = require('underscore');
var express = require('express');
var http = require('http');
var url = require('url');
var WebSocketClient = require('ws');

var argv = require('optimist')
	.default('port', 45735)
	.argv;

var servers = [];
var scanInterval = 30 * 1000;

function main() {
	createServer(argv.port);

	setTimeout(scanServers, scanInterval);
}

function createServer(port) {
	var app = express();

	app.use(express.compress());
	app.use(express.bodyParser());

	var server = http.createServer(app);

	app.post('/heartbeat', handleHeartbeat);
	app.get('/servers', handleServers);

	server.listen(port, function () {
		console.log('Master server is now listening on port', port);
	});

	return server;
}

function handleHeartbeat(req, res, next) {
	var hostname = req.connection.remoteAddress.toLowerCase();
	var port = parseInt(req.body.port, 10);

	res.type('json');

	if (isNaN(port)) {
		res.send(500, { error: 'Invalid port number.' });
		return;
	}

	var address = hostname + ':' + port;

	console.log('Received heartbeat from', address);

	if (servers.indexOf(address) === -1) {
		servers.push(address);
	}

	res.send({ message: 'success' });
	res.end();
}

function handleServers(req, res, next) {
	res.type('json');
	res.send(servers);
}

function scanServers() {

}

function scanServer(callback) {
	var ws = new WebSocketClient('ws://localhost:9001');

	ws.on('open', function () {
		console.log('WebSocket client connected');

		// FIXME node.js encodes 0x0 as 0x20 for some reason so we force it.
		// https://github.com/joyent/node/issues/297
		var buff = new Buffer('\xff\xff\xff\xffgetinfo\0', 'ascii');
		buff[buff.length - 1] = 0;

		ws.send(buff, { binary: true });
	});

	ws.on('message', function (data, flags) {
		if (!flags.binary) {
			return callback(new Error('Received non-binary response.'));
		}

		if (data.readInt8(0) !== -1) {
			return callback(new Error('Invalid header.'));
		}

		// Account for null-terminator.
		console.log(data.length);

		var str = data.toString('ascii', 4, data.length - 1);
		var json = JSON.parse(str);

		ws.close();

		return callback(null, json);
	});

	ws.on('error', function (err) {
		return callback(err);
	});
}

scanServer(function (err, json) {
	console.log(err, json);
});

// main();