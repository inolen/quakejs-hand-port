var connections = {};

/**
 * AddConnection
 */
function AddConnection(addr, socket) {
	var key = addr.ip + ':' + addr.port;

	connections[key] = {
		addr: addr,
		socket: socket
	};
}

/**
 * RemoveConnection
 */
function RemoveConnection(addr) {
	var key = addr.ip + ':' + addr.port;

	delete connections[key];
}

/**
 * SocketForAddr
 */
function SocketForAddr(addr) {
	var key = addr.ip + ':' + addr.port;
	var connection = connections[key];

	return connection ? connection.socket : null;
}

/**
 * NetCreateServer
 */
function NetCreateServer() {
	error('Should not happen');
}

/**
 * NetConnectToServer
 */
function NetConnectToServer(addr, callback, errback) {
	var socket = new WebSocket('ws://' + addr.ip + ':' + addr.port, ['quakejs']);
	socket.binaryType = 'arraybuffer';

	AddConnection(addr, socket);

	socket.onopen = function () {
		if (callback) {
			callback();
		}
	};

	socket.onmessage = function (event) {
		com.QueueEvent({ type: SE.CLNETMSG, addr: addr, buffer: event.data });
	};

	socket.onerror = function (error) {
		if (errback) {
			errback();
		}
		NetClose(addr);
	};

	socket.onclose = function () {
		if (errback) {
			errback();
		}
		NetClose(addr);
	};
}

/**
 * NetSend
 */
function NetSend(addr, buffer, length) {
	var socket = SocketForAddr(addr);
	if (!socket) {
		return;
	}

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
function NetClose(addr) {
	var socket = SocketForAddr(addr);
	if (!socket) {
		return;
	}

	socket.close();

	RemoveConnection(addr);
}