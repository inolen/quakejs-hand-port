var http = require('http');
var WebSocketServer = require('websocket').server;

var connections = {};

/**
 * AddConnection
 */
function AddConnection(addr, socket) {
	var key = addr.ip + ':' + addr.port;

	connections[key] = {
		addr: addr,
		socket: socket
	};
}

/**
 * RemoveConnection
 */
function RemoveConnection(addr) {
	var key = addr.ip + ':' + addr.port;

	delete connections[key];
}

/**
 * SocketForAddr
 */
function SocketForAddr(addr) {
	var key = addr.ip + ':' + addr.port;
	var connection = connections[key];

	return connection ? connection.socket : null;
}

/**
 * NetCreateServer
 */
function NetCreateServer(port) {
	var server = http.createServer();

	var wsServer = new WebSocketServer({
		httpServer: server,
		autoAcceptConnections: false
	});

	wsServer.on('request', function(request) {
		var socket = request.accept('quakejs', request.origin);
		log((new Date()), 'Connection accepted.');

		// Parse net address from socket, this is used to uniquely identify
		// connections throughout sv / sys-net.
		var addr = new NetAdr();
		addr.type = NA.IP;
		addr.ip = socket.remoteAddress;
		addr.port = socket.remotePort;

		AddConnection(addr, socket);

		socket.on('message', function (message) {
			// TODO Clean this up. It'd be nice if we found a Node WebSocket library
			// that uses ArrayBuffers, but for now lets go ahead and convert this Buffer
			// to one so it works correctly all across the board.
			var data = message.binaryData;
			var view = new Uint8Array(data.length);
			for (var i = 0; i < data.length; ++i) {
				view[i] = data[i];
			}

			com.QueueEvent({
				type: SE.,
				addr: addr,
				buffer: view
			});
		});

		socket.on('error', function () {
			NetClose(addr);
		});

		socket.on('close', function () {
			NetClose(addr);
		});
	});

	server.listen(port, function() {
		log((new Date()), 'Game server is listening on port', port);
	});
}

/**
 * NetConnectToServer
 */
function NetConnectToServer(addr, callback) {
	error('Should not happen');
}

/**
 * NetSend
 */
function NetSend(addr, ab, length) {
	var socket = SocketForAddr(addr);
	if (!socket) {
		// console.log('NetSend null socket');
		return;
	}

	// TODO optimize this, converting the buffer is lame.
	var buffer = new Buffer(length);
	var view = new Uint8Array(ab);
	for (var i = 0; i < length; ++i) {
		buffer[i] = view[i];
	}

	socket.sendBytes(buffer);
}

/**
 * NetClose
 */
function NetClose(addr) {
	var socket = SocketForAddr(addr);
	if (!socket) {
		return;
	}

	// Let the server now.
	com.QueueEvent({ type: SE.SVNETCLOSE, addr: addr });

	socket.close();

	RemoveConnection(addr);
}