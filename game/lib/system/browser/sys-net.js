/**
 * NetCreateServer
 */
function NetCreateServer() {
	error('Should not happen');
}

/**
 * NetConnectToServer
 */
function NetConnectToServer(addr) {
	var socket;

	socket = new WebSocket('ws://' + addr.ip + ':' + addr.port, ['q3js']);
	socket.binaryType = 'arraybuffer';
	socket.onopen = function () {
	};
	socket.onmessage = function (event) {
		com.QueueEvent({ type: SE.CLMSG, addr: addr, buffer: event.data });
	};
	socket.onerror = function (error) {
	};
	socket.onclose = function () {
	};

	return socket;
}

/**
 * NetSend
 */
function NetSend(socket, buffer, length) {
	if (socket.readyState !== 1) {
		return;
	}

	// TODO Use this instead of truncating the array once Chrome
	// supports sending an ArrayBufferView.
	//var view = new Uint8Array(buffer, 0, length);
	//socket.send(view);
	
	if (buffer.byteLength !== length) {
		buffer = buffer.slice(0, length);
	}

	socket.send(buffer);
}

/**
 * NetClose
 */
function NetClose(socket) {
	socket.close();
}