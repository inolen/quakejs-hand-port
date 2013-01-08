var http = require('http');
var WebSocketServer = require('websocket').server;

/**
 * NetListen
 */
function NetListen(port, opts) {
	var server = http.createServer();

	var wsServer = new WebSocketServer({
		httpServer: server,
		autoAcceptConnections: false
	});

	wsServer.on('request', function (request) {
		// If a request handler was specified, call it.
		if (opts.onrequest && !opts.onrequest(request.origin)) {
			request.reject();
			log((new Date()) + ' Connection from origin ' + request.origin + ' rejected.');
			return;
		}

		var socket = request.accept('quakejs', request.origin);
		log((new Date()), 'Connection accepted from ' + request.origin + '.');

		var msocket = new MetaSocket();
		msocket.handle = socket;

		// Persist the events down to the optional event handlers.
		socket.on('message', function (message) {
			// TODO Clean this up. It'd be nice if we found a Node WebSocket library
			// that uses ArrayBuffers, but for now lets go ahead and convert this Buffer
			// to one so it works correctly all across the board.
			var data = message.binaryData;
			var view = new Uint8Array(data.length);
			for (var i = 0; i < data.length; ++i) {
				view[i] = data[i];
			}

			if (msocket.onmessage) {
				msocket.onmessage(view);
			}
		});

		socket.on('error', function (err) {
			if (msocket.onclose) {
				msocket.onclose(err);
			}
		});

		socket.on('close', function () {
			if (msocket.onclose) {
				msocket.onclose();
			}
		});

		// Trigger the onaccept callback.
		if (opts.onaccept) {
			opts.onaccept(msocket);
		}
	});

	server.listen(port, function() {
		log((new Date()), 'Game server is listening on port', port);
	});
}

/**
 * NetConnect
 */
function NetConnect(hSocket, callback) {
	error('Should not happen');
}

/**
 * NetSend
 */
function NetSend(msocket, ab, length) {
	var socket = msocket.handle;

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
function NetClose(msocket) {
	var socket = msocket.handle;
	socket.close();
}