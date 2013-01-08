/**
 * NetListen
 */
function NetListen() {
	error('Should not happen');
}

/**
 * NetConnect
 */
function NetConnect(addr) {
	var socket = new WebSocket('ws://' + addr.ip + ':' + addr.port, ['quakejs']);
	socket.binaryType = 'arraybuffer';

	var msocket = new MetaSocket();
	msocket.handle = socket;

	// Persist the events down to the optional event handlers.
	socket.onopen = function () {
		if (msocket.onopen) {
			msocket.onopen();
		}
	};

	socket.onmessage = function (event) {
		if (msocket.onmessage) {
			msocket.onmessage(event.data);
		}
	};

	socket.onerror = function (error) {
		if (msocket.onclose) {
			msocket.onclose(error);
		}
	};

	socket.onclose = function () {
		if (msocket.onclose) {
			msocket.onclose();
		}
	};

	return msocket;
}

/**
 * NetSend
 */
function NetSend(msocket, buffer, length) {
	var socket = msocket.handle;

	// TODO Use this instead of truncating the array once Chrome
	// supports sending an ArrayBufferView.
	//var view = new Uint8Array(buffer, 0, length);
	//socket.send(view);

	if (buffer.byteLength !== length) {
		buffer = buffer.slice(0, length);
	}

	// Close it all down if we encounter any errors.
	try {
		socket.send(buffer);
	} catch (e) {
		NetClose(addr);
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