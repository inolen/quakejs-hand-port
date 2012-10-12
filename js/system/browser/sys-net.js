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

function NetSend(socket, buffer) {
	if (socket.readyState !== 1) {
		return;
	}

	socket.send(buffer);
}

function NetClose(socket) {
	socket.close();
}