/**
 * NetListen
 */
function NetListen() {
	error('Should not happen');
}

/**
 * NetConnect
 */
function NetConnect(ip, port) {
	var ws = new WebSocket('ws://' + ip + ':' + port);
	ws.binaryType = 'arraybuffer';

	var msocket = new MetaSocket(ws);

	// Persist the events down to the optional event handlers.
	ws.onopen = function () {
		msocket.onopen && msocket.onopen();
	};

	ws.onmessage = function (event) {
		if (!(event.data instanceof ArrayBuffer)) {
			return;  // not supported
		}

		msocket.onmessage && msocket.onmessage(event.data);
	};

	ws.onerror = function () {
		msocket.onclose && msocket.onclose();
	};

	ws.onclose = function () {
		msocket.onclose && msocket.onclose();
	};

	return msocket;
}

/**
 * NetSend
 */
function NetSend(msocket, view) {
	var socket = msocket.handle;

	// TODO Use this until Chrome supports sending an ArrayBufferView.
	var buffer = view.buffer.slice(0, view.length);

	// Close it all down if we encounter any errors.
	try {
		socket.send(buffer);
	} catch (e) {
		NetClose(msocket);
	}
}

/**
 * NetClose
 */
function NetClose(msocket) {
	var socket = msocket.handle;

	try {
		socket.close();
	} catch (e) {
	}
}