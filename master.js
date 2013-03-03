var http = require('http');
var opt = require('optimist');
var url = require('url');
var WebSocketClient = require('ws');
var WebSocketServer = require('ws').Server;

var argv = require('optimist')
	.describe('port', 'Port to bind to').default('port', 45735)
	.argv;

if (argv.h || argv.help) {
	opt.showHelp();
	return;
}

var subscribers = [];
var servers = {};
var pruneInterval = 60 * 1000;

function main() {
	createServer(argv.port);

	setInterval(pruneServers, pruneInterval);
}

function log() {
	var args = Array.prototype.slice.call(arguments);
	args.splice(0, 0, (new Date()).toString());
	Function.apply.call(console.log, console, args);
}

function createServer(port) {
	var server = http.createServer();

	var wss = new WebSocketServer({
		server: server
	});

	wss.on('connection', function (ws) {
		log('Connection accepted from ' + ws._socket.remoteAddress);

		ws.on('message', function (buffer, flags) {
			if (!flags.binary) {
				return;
			}

			var data = stripOOB(buffer);

			if (data === null) {
				removeSubscriber(ws);
				return;
			}

			if (data.type === 'heartbeat') {
				handleHeartbeat(ws, data);
			} else if (data.type === 'subscribe') {
				handleSubscribe(ws, data);
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
		log('Master server is listening on port ' + server.address().port);
	});

	return server;
}

/**********************************************************
 *
 * OOB helpers
 *
 **********************************************************/
function formatOOB(data) {
	var str = '\xff\xff\xff\xff' + JSON.stringify(data) + '\x00';

	var buffer = new ArrayBuffer(str.length);
	var view = new Uint8Array(buffer);

	for (var i = 0; i < str.length; i++) {
		view[i] = str.charCodeAt(i);
	}

	return buffer;
}

function stripOOB(buffer) {
	var view = new DataView(buffer);

	if (view.getInt32(0) !== -1) {
		return null;
	}

	var str = '';
	for (var i = 4; i < buffer.length; i++) {
		var c = String.fromCharCode(view.getUint8(i));
		if (c === '\x00') break;
		str += c;
	}

	var data = JSON.parse(str);
	return data;
}

/**********************************************************
 *
 * Heartbeats
 *
 **********************************************************/
function handleHeartbeat(ws, data) {
	var ipaddr = ws._socket.remoteAddress;
	var port = parseInt(data.port, 10);

	if (isNaN(port)) {
		return;
	}

	var address = ipaddr + ':' + port;

	log('Received heartbeat from ' + address);

	// Scan server immediately.
	scanServer(address, function (err) {
		if (err) {
			removeServer(address);
			return;
		}

		updateServer(address);
	});
}

function scanServer(address, callback) {
	var ws = new WebSocketClient('ws://' + address);

	ws.on('open', function () {
		var buffer = formatOOB({ type: 'getinfo' });

		ws.send(buffer, { binary: true });
	});

	ws.on('message', function (buffer, flags) {
		if (!flags.binary) {
			return callback(new Error('Received non-binary response.'));
		}

		var data = stripOOB(buffer);

		if (data === null) {
			return callback(new Error('Invalid header.'));
		}

		// TODO Validate data or something?

		ws.close();
		return callback(null);
	});

	ws.on('error', function (err) {
		return callback(err);
	});
}

function updateServer(address) {
	if (!servers[address]) {
		log('Adding server ' + address);
	} else {
		log('Updating server ' + address);
	}

	servers[address] = Date.now();

	// Send partial update to subscribers.
	sendMessageToSubscribers({
		type: 'servers',
		servers: [address]
	});
}

function removeServer(address) {
	log('Removing server ' + address);

	delete servers[address];
}

function pruneServers() {
	var now = Date.now();

	for (var address in servers) {
		if (!servers.hasOwnProperty(address)) {
			continue;
		}

		var delta = now - servers[address];

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
function handleSubscribe(ws, data) {
	addSubscriber(ws);

	// Send all servers upon subscribing.
	sendMessageToSubscribers({
		type: 'servers',
		servers: Object.keys(servers)
	});
}

function addSubscriber(ws) {
	var idx = subscribers.indexOf(ws);

	if (idx !== -1) {
		return;  // already subscribed
	}

	log('Adding subscriber ' + ws._socket.remoteAddress);

	subscribers.push(ws);
}

function removeSubscriber(ws) {
	var idx = subscribers.indexOf(ws);
	if (idx === -1) {
		return;  // should not happen
	}

	log('Removing subscriber');

	subscribers.splice(idx, 1);
}

function sendMessageToSubscribers(data) {
	log('Sending message to ' + subscribers.length + ' subscribers');

	var buffer = formatOOB(data);

	for (var i = 0; i < subscribers.length; i++) {
		subscribers[i].send(buffer, { binary: true });
	}
}

main();