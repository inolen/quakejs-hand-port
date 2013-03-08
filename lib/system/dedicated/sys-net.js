var http = require('http');
var url = require('url');
var WebSocketClient = require('ws');
var WebSocketServer = require('ws').Server;

/**
 * NetListen
 */
function NetListen(ip, port, opts) {
	var server = http.createServer();

	var wss = new WebSocketServer({
		server: server
	});

	wss.on('connection', function (ws) {
		// If a request handler was specified, call it.
		if (opts.onrequest && !opts.onrequest(ws._socket.remoteAddress)) {
			log((new Date()) + ' Connection from origin ' + ws._socket.origin + ' rejected.');
			ws.close();
			return;
		}

		var msocket = new MetaSocket(ws);

		// Persist the events down to the optional event handlers.
		ws.on('message', function (message) {
			// Convert Buffer to ArrayBuffer.
			var buffer = new ArrayBuffer(message.length);
			var view = new Uint8Array(buffer);

			for (var i = 0; i < message.length; ++i) {
				view[i] = message[i];
			}

			msocket.onmessage && msocket.onmessage(buffer);
		});

		ws.on('error', function () {
			msocket.onclose && msocket.onclose();
		});

		ws.on('close', function () {
			msocket.onclose && msocket.onclose();
		});

		// Trigger the onaccept callback.
		opts.onaccept && opts.onaccept(msocket);
	});

	log((new Date()), 'Attempting to start game server on', ip, port);

	server.listen(port, ip, function() {
		log((new Date()), 'Game server is listening on port', server.address().address, server.address().port);
	});
}

/**
 * NetConnect
 */
function NetConnect(ip, port) {
	var ws = new WebSocketClient('ws://' + ip + ':' + port);

	var msocket = new MetaSocket(ws);

	// Persist the events down to the optional event handlers.
	ws.on('open', function () {
		msocket.onopen && msocket.onopen();
	});

	ws.on('message', function (data, flags) {
		if (!flags.binary) {
			return;  // not supported
		}

		msocket.onmessage && msocket.onmessage(data);
	});

	ws.on('error', function () {
		msocket.onclose && msocket.onclose();
	});

	ws.on('close', function () {
		msocket.onclose && msocket.onclose();
	});

	return msocket;
}

/**
 * NetSend
 */
function NetSend(msocket, buffer) {
	var ws = msocket.handle;

	try {
		ws.send(buffer, { binary: true });
	} catch (e) {
		log('NetSend:', e.message);

		NetClose(msocket);
	}
}

/**
 * NetClose
 */
function NetClose(msocket) {
	var ws = msocket.handle;
	try {
		ws.close();
	} catch (e) {
		log('NetClose:', e.message);
	}
}