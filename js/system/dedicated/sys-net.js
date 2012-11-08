var http = require('http');
var WebSocketServer = require('websocket').server;

/**
 * NetCreateServer
 */
function NetCreateServer() {
	var server = http.createServer();
	var wsServer = new WebSocketServer({
		httpServer: server,
		autoAcceptConnections: false
	});

	server.listen(9001, function() {
		log((new Date()) + ' Server is listening on port 8080');
	});

	wsServer.on('request', function(request) {
		var connection = request.accept('q3js', request.origin);
		log((new Date()) + ' Connection accepted.');

		com.QueueEvent({ type: com.EventTypes.NETSVCONNECT, socket: connection });

		connection.on('message', function (message) {
			// TODO Clean this up. It'd be nice if we found a Node WebSocket library
			// that uses ArrayBuffers, but for now lets go ahead and convert this Buffer
			// to one so it works correctly all across the board.
			var data = message.binaryData;
			var ab = new ArrayBuffer(data.length);
			var view = new Uint8Array(ab);
			for (var i = 0; i < data.length; ++i) {
				view[i] = data[i];
			}

			com.QueueEvent({
				type: com.EventTypes.NETSVMESSAGE,
				socket: connection,
				buffer: ab
			});
		});

		connection.on('close', function(reasonCode, description) {
			com.QueueEvent({ type: com.EventTypes.NETSVSOCKETCLOSED, socket: connection });
		});
	});
}

function NetConnectToServer(addr) {
	error('Should not happen');
}

function NetSend(socket, ab, length) {
	// TODO optimize this, converting the buffer is lame.
	var buffer = new Buffer(length);
	var view = new Uint8Array(ab);
	for (var i = 0; i < length; ++i) {
		buffer[i] = view[i];
	}
	socket.sendBytes(buffer);
}

function NetClose(socket) {
	socket.close();
}