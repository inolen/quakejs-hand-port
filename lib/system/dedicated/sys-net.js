var http = require('http');
var url = require('url');
var WebSocketClient = require('ws');
var WebSocketServer = require('ws').Server;

/**
 * NetListen
 */
function NetListen(address, port, opts) {
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

		log((new Date()), 'Connection accepted from ' + ws._socket.remoteAddress + '.');

		var msocket = new MetaSocket();
		msocket.handle = ws;

		// Persist the events down to the optional event handlers.
		ws.on('message', function (message) {
			// Convert Buffer to ArrayBuffer.
			var buffer = new ArrayBuffer(message.length);
			var view = new Uint8Array(buffer);

			for (var i = 0; i < message.length; ++i) {
				view[i] = message[i];
			}

			if (msocket.onmessage) {
				msocket.onmessage(buffer);
			}
		});

		ws.on('error', function (err) {
			if (msocket.onclose) {
				msocket.onclose(err);
			}
		});

		ws.on('close', function () {
			if (msocket.onclose) {
				msocket.onclose();
			}
		});

		// Trigger the onaccept callback.
		if (opts.onaccept) {
			opts.onaccept(msocket);
		}
	});

	log((new Date()), 'Attempting to start game server on', address, port);

	server.listen(port, address, function() {
		log((new Date()), 'Game server is listening on port', server.address().address, server.address().port);
	});
}

/**
 * NetConnect
 */
function NetConnect(addr) {
	var ws = new WebSocketClient('ws://' + addr.ip + ':' + addr.port);

	var msocket = new MetaSocket();
	msocket.handle = ws;

	// Persist the events down to the optional event handlers.
	ws.on('open', function () {
		if (msocket.onopen) {
			msocket.onopen();
		}
	});

	ws.on('message', function (data, flags) {
		if (!flags.binary) {
			return;  // unsupported
		}

		if (msocket.onmessage) {
			msocket.onmessage(data);
		}
	});

	ws.on('error', function (err) {
		if (msocket.onclose) {
			msocket.onclose(err);
		}
	});

	ws.on('close', function () {
		if (msocket.onclose) {
			msocket.onclose();
		}
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