var _ = require('underscore');
var http = require('http');
var url = require('url');
var WebSocketClient = require('ws');
var WebSocketServer = require('ws').Server;

var argv = require('optimist')
	.default('port', 45735)
	.argv;

var subscribers = [];
var servers = {};
var pruneInterval = 60 * 1000;

function main() {
	createServer(argv.port);

	setInterval(pruneServers, pruneInterval);
}

function createServer(port) {
	var server = http.createServer();

	var wss = new WebSocketServer({
		server: server
	});

	wss.on('connection', function (ws) {
		console.log((new Date()) + ' Connection accepted from ' + ws._socket.remoteAddress);

		ws.on('message', function (data, flags) {
			// Heartbeats come from the game as ArrayBuffers.
			if (flags.binary) {
				if (data.readInt8(0) !== -1) {
					return;
				}

				// Skip past the -1 and ignore the trailing \0 from the game.
				data = data.toString('ascii', 4, data.length - 1);
			}

			// Parse out the JSON message.
			var msg;
			try {
				msg = JSON.parse(data);
			} catch (e) {
				return;
			}

			if (msg.type === 'heartbeat') {
				handleHeartbeat(ws, msg);
			} else if (msg.type === 'subscribe') {
				handleSubscribe(ws, msg);
			}
		});

		ws.on('error', function (err) {
			removeSubscriber(ws);
		});

		ws.on('close', function () {
			removeSubscriber(ws);
		});
	});

	server.listen(port, function() {
		console.log(new Date() + ' Master server is listening on port ' + server.address().port);
	});

	return server;
}

/**********************************************************
 *
 * Heartbeats
 *
 **********************************************************/
function handleHeartbeat(ws, msg) {
	var hostname = ws._socket.remoteAddress;
	var port = parseInt(msg.port, 10);

	if (isNaN(port)) {
		return;
	}

	var address = hostname + ':' + port;

	console.log((new Date()) + ' Received heartbeat from ' + address);

	// Scan server immediately.
	scanServer(address, function (err, data) {
		if (err) {
			removeServer(address);
			return;
		}

		updateServer(address, data);
	});
}

function scanServer(address, callback) {
	var ws = new WebSocketClient('ws://' + address);

	ws.on('open', function () {
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
		var str = data.toString('ascii', 4, data.length - 1);
		var json = JSON.parse(str);

		ws.close();

		return callback(null, json);
	});

	ws.on('error', function (err) {
		return callback(err);
	});
}

function updateServer(address, data) {
	if (!servers[address]) {
		console.log((new Date()) + ' Adding server ' + address);
	} else {
		console.log((new Date()) + ' Updating server ' + address);
	}

	servers[address] = data;
	servers[address].timestamp = Date.now();

	// Send partial update to subscribers.
	var partial = {};
	partial[address] = servers[address];

	sendMessageToSubscribers(JSON.stringify({
		type: 'servers',
		servers: partial
	}));
}

function removeServer(address) {
	console.log((new Date()) + ' Removing server ' + address);

	delete servers[address];
}

function pruneServers() {
	var now = Date.now();

	for (var address in servers) {
		if (!servers.hasOwnProperty(address)) {
			continue;
		}

		var delta = now - servers[address].timestamp;

		if (delta > pruneInterval) {
			removeServer(address);
		}
	}
}

/**********************************************************
 *
 * Subscriptions
 *
 **********************************************************/
function handleSubscribe(ws, msg) {
	addSubscriber(ws);

	// Send all servers upon subscribing.
	sendMessageToSubscribers(JSON.stringify({
		type: 'servers',
		servers: servers
	}));
}

function addSubscriber(ws) {
	var idx = subscribers.indexOf(ws);

	if (idx !== -1) {
		return;  // already subscribed
	}

	console.log((new Date()) + ' Adding subscriber ' + ws._socket.remoteAddress);

	subscribers.push(ws);
}

function removeSubscriber(ws) {
	var idx = subscribers.indexOf(ws);
	if (idx === -1) {
		return;  // should not happen
	}

	console.log((new Date()) + ' Removing subscriber');

	subscribers.splice(idx, 1);
}

function sendMessageToSubscribers(msg) {
	console.log((new Date()) + ' Sending message to ' + subscribers.length + ' subscribers');

	for (var i = 0; i < subscribers.length; i++) {
		subscribers[i].send(msg);
	}
}

main();