function NetCreateServer() {
	throw new Error('Should not happen');
}

function NetConnectToServer(addr) {
	var socket;

	socket = new WebSocket('ws://' + addr.ip + ':' + addr.port, ['q3js']);
	socket.binaryType = 'arraybuffer';
	socket.onopen = function () {
	};
	socket.onmessage = function (event) {
		com.QueueEvent({ type: com.EventTypes.NETCLMESSAGE, addr: addr, buffer: event.data });
	};
	socket.onerror = function (error) {
	};

	return socket;
}

function NetSend(socket, buffer, length) {
	if (socket.readyState !== 1) {
		return;
	}

	// Make a truncated copy of the incoming buffer if the length doesn't
	// match. This often happens due to us pre-allocating a buffer of
	// MAX_MSGLEN everywhere. If only the WebSocket API would allow you
	// to pass a length parameter to send.
	if (buffer.byteLength !== length) {
		buffer = buffer.slice(0, length);
	}

	socket.send(buffer);
}

function NetClose(socket) {
	socket.close();
}