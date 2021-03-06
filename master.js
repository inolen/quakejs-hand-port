var _ = require('underscore');
var http = require('http');
var opt = require('optimist');
var url = require('url');
var WebSocketClient = require('ws');
var WebSocketServer = require('ws').Server;

var argv = require('optimist')
	.describe('config', 'Location of the configuration file').default('config', './master.json')
	.argv;

if (argv.h || argv.help) {
	opt.showHelp();
	return;
}

var subscribers = [];
var servers = {};
var pruneInterval = 60 * 1000;

function log() {
	var args = Array.prototype.slice.call(arguments);
	args.splice(0, 0, (new Date()).toString());
	Function.apply.call(console.log, console, args);
}

function toArrayBuffer(buffer) {
	var ab = new ArrayBuffer(buffer.length);
	var view = new Uint8Array(ab);
	for (var i = 0; i < buffer.length; i++) {
		view[i] = buffer[i];
	}
	return ab;
}

function main() {
	var config = loadConfig();

	createServer(config.port);

	setInterval(pruneServers, pruneInterval);
}

function loadConfig() {
	var config = {
		port: 45735
	};
	try {
		console.log('Loading config file from ' + argv.config + '..');
		var data = require(argv.config);
		_.extend(config, data);
	} catch (e) {
		console.log('Failed to load config', e);
	}

	return config;
}

function createServer(port) {
	var server = http.createServer();

	var wss = new WebSocketServer({
		server: server
	});

	wss.on('connection', function (ws) {
		var address = getRemoteAddress(ws);

		log('Connection accepted from ' + address);

		ws.on('message', function (buffer, flags) {
			if (!flags.binary) {
				return;
			}

			// node Buffer to ArrayBuffer
			// buffer = (new Uint8Array(buffer)).buffer;
			buffer = toArrayBuffer(buffer);

			var msg = stripOOB(buffer);
			if (!msg) {
				log('Failed to parse message from ' + address);
				removeSubscriber(ws);
				return;
			}

			if (msg.type === 'heartbeat') {
				handleHeartbeat(ws, msg.data);
			} else if (msg.type === 'subscribe') {
				handleSubscribe(ws, msg.data);
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

function getRemoteAddress(ws) {
	// By default, check the underlying socket's remote address.
	var address = ws._socket.remoteAddress;

	// If this is an x-forwarded-for header (meaning the request
	// has been proxied), use it.
	if (ws.upgradeReq.headers['x-forwarded-for']) {
		address = ws.upgradeReq.headers['x-forwarded-for'];
	}

	if (!address) {
		log('Failed to parse address for socket', JSON.stringify(ws));
	}

	return address;
}

function getRemotePort(ws) {
	var port = ws._socket.remotePort;

	if (ws.upgradeReq.headers['x-forwarded-port']) {
		port = ws.upgradeReq.headers['x-forwarded-port'];
	}

	if (!port) {
		log('Failed to parse port for socket', JSON.stringify(ws));
	}

	return port;
}

/**********************************************************
 *
 * Heartbeats
 *
 **********************************************************/
function handleHeartbeat(ws, data) {
	var address = getRemoteAddress(ws);
	var port = getRemotePort(ws);

	if (!address || !port) {
		return;
	}

	// If a hostname is specified, override the IP address with it.
	if (data && data.hostname) {
		address = data.hostname;
	}

	// Same with port.
	if (data && data.port) {
		port = data.port;
	}

	var socket = address + ':' + port;

	log('Received heartbeat from ' + socket, JSON.stringify(data));

	// Scan server immediately.
	scanServer(socket, function (err) {
		if (err) {
			removeServer(socket);
			return;
		}

		updateServer(socket);
	});
}

function scanServer(socket, callback) {
	var ws = new WebSocketClient('ws://' + socket);

	ws.on('open', function () {
		var buffer = formatOOB({ type: 'getinfo' });

		ws.send(buffer, { binary: true });
	});

	ws.on('message', function (buffer, flags) {
		if (!flags.binary) {
			return callback(new Error('Received non-binary response.'));
		}

		// node Buffer to ArrayBuffer
		buffer = toArrayBuffer(buffer);

		var data = stripOOB(buffer);

		if (!data) {
			return callback(new Error('Failed to parse message from ' + socket));
		}

		// TODO Validate data or something?
		log('Got info from ' + socket + ' ' + JSON.stringify(data));
		ws.close();

		return callback(null);
	});

	ws.on('error', function (err) {
		return callback(err);
	});
}

function updateServer(socket) {
	if (!servers[socket]) {
		log('Adding server ' + socket);
	} else {
		log('Updating server ' + socket);
	}

	servers[socket] = Date.now();

	// Send partial update to subscribers.
	sendMessageToSubscribers({
		type: 'servers',
		servers: [socket]
	});
}

function removeServer(socket) {
	log('Removing server ' + socket);

	delete servers[socket];
}

function pruneServers() {
	var now = Date.now();

	for (var socket in servers) {
		if (!servers.hasOwnProperty(socket)) {
			continue;
		}

		var delta = now - servers[socket];

		if (delta > pruneInterval) {
			removeServer(socket);
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

	log('Adding subscriber ' + getRemoteAddress(ws));

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
	for (var i = 4; i < buffer.byteLength; i++) {
		var c = String.fromCharCode(view.getUint8(i));
		if (c === '\x00') break;
		str += c;
	}

	var data;

	try {
		data = JSON.parse(str);
	} catch (e) {
		return null;
	}

	return data;
}

main();