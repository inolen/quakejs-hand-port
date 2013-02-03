var http = require('http');
var url = require('url');
var WebSocketServer = require('ws').Server;

/**
 * NetListen
 */
function NetListen(port, opts) {
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
			if (msocket.onmessage) {
				// Marshal into a Uint8Array.
				var view = new Uint8Array(message);
				msocket.onmessage(view);
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

	server.listen(port, function() {
		log((new Date()), 'Game server is listening on port', server.address().port);
	});
}

/**
 * NetConnect
 */
function NetConnect(hSocket, callback) {
	error('NetConnect: Should not happen');
}

/**
 * NetSend
 */
function NetSend(msocket, buffer) {
	var ws = msocket.handle;

	ws.send(buffer, { binary: true });
}

/**
 * NetClose
 */
function NetClose(msocket) {
	var ws = msocket.handle;
	ws.close();
}

/**
 * HttpPost
 *
 * Perform an HTTP post of JSON data.
 */
function HttpPost(urlstr, data, callback) {
	var parsed = url.parse(urlstr);
	var json = JSON.stringify(data);

	var options = {
		host: parsed.hostname,
		port: parsed.port,
		path: parsed.pathname,
		method: 'POST',
		headers: {
			'Content-Type': 'application/json',
			'Content-Length': json.length
		}
	};

	var req = http.request(options, function (res) {
		if (res.statusCode !== 200) {
			return callback(new Error('Invalid HTTP response code: ' + res.statusCode));
		}

		res.setEncoding('utf-8');

		var buffer = '';

		res.on('data', function (chunk) {
			buffer += chunk;
		});

		res.on('end', function () {
			callback(null, JSON.parse(buffer));
		});
	}).on('error', function (err) {
		callback(err);
	});

	if (json !== null) {
		req.write(json);
	}
	req.end();
}