var http = require('http');
var WebSocketServer = require('websocket').server;

function NetCreateServer() {
	var server = http.createServer();
	var wsServer = new WebSocketServer({
		httpServer: server,
		autoAcceptConnections: false
	});

	server.listen(9001, function() {
		console.log((new Date()) + ' Server is listening on port 8080');
	});

	wsServer.on('request', function(request) {
		var connection = request.accept('q3js', request.origin);
		var addr = com.NetchanSetup(NetSrc.SERVER, connection.remoteAddress, connection);

		console.log((new Date()) + ' Connection accepted.');

		com.QueueEvent({ type: com.EventTypes.NETCONNECT, addr: addr, socket: connection });

		connection.on('message', function (message) {
			com.QueueEvent({ type: com.EventTypes.NETSVMESSAGE, addr: addr, buffer: message.binaryData });
		});

		connection.on('close', function(reasonCode, description) {
			com.QueueEvent({ type: com.EventTypes.NETDISCONNECT, addr: addr });
		});
	});
}

function NetConnectToServer(addr) {
	throw new Error('Should not happen');
}

function NetSend(socket, ab) {
	// TODO optimize this, converting the buffer is lame.
	var buffer = new Buffer(ab.byteLength);
	var view = new Uint8Array(ab);
	for (var i = 0; i < buffer.length; ++i) {
		buffer[i] = view[i];
	}
	socket.sendBytes(buffer);
}

function NetClose(socket) {
	socket.close();
}