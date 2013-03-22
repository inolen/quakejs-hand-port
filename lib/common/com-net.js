var MAX_LOOPBACK  = 16;

// Global loopback accept handler.
var loopbackAccept = null;

var msgBuffer = new ArrayBuffer(MAX_MSGLEN);

var LoopbackSocket = function () {
	this.remoteSocket = null;
	this.onopen       = null;
	this.onmessage    = null;
	this.onclose      = null;
	this.msgs         = new Array(MAX_LOOPBACK);
	this.send         = 0;

	for (var i = 0; i < MAX_LOOPBACK; i++) {
		this.msgs[i] = new ArrayBuffer(MAX_MSGLEN);
	}
};

/**
 * StringToAddr
 */
function StringToAddr(str) {
	if (!str) {
		return null;
	}

	var addr = new QS.NetAdr();

	if (str.indexOf('localhost') !== -1) {
		addr.type = QS.NA.LOOPBACK;
		addr.ip = 'localhost';
		addr.port = 0;
		return addr;
	}

	addr.type = QS.NA.IP;

	var split = str.split(':');
	if (!split.length) {
		return null;
	}

	var port = parseInt(split[1], 10);
	if (isNaN(port)) {
		port = 80;
	}

	addr.ip = split[0];
	addr.port = port;

	return addr;
}

/**
 * SockToString
 */
function SockToString(socket) {
	if (socket instanceof LoopbackSocket) {
		return 'loopback';
	}

	return SYS.SockToString(socket);
}

/**
 * NetConnect
 */
function NetConnect(addr, opts) {
	var socket;

	// Client attempting to connect to faux loopback server.
	if (addr.type === QS.NA.LOOPBACK) {
		socket = new LoopbackSocket();

		// Create the loop.
		socket.remoteSocket = new LoopbackSocket();
		socket.remoteSocket.remoteSocket = socket;

		// Go ahead and trigger fake open / accept events.
		setTimeout(function () {
			if (!loopbackAccept) {
				socket.onclose && socket.onclose();
				return;
			}

			socket.onopen && socket.onopen();

			loopbackAccept(socket.remoteSocket);
		}, 0);
	} else {
		socket = SYS.NetConnect(addr.ip, addr.port);
	}

	socket.onopen = opts.onopen;
	socket.onmessage = opts.onmessage;
	socket.onclose = opts.onclose;

	return socket;
}

/**
 * NetListen
 */
function NetListen(addr, opts) {
	if (addr.type === QS.NA.LOOPBACK) {
		loopbackAccept = opts.onaccept;
		return;
	}

	SYS.NetListen(addr.ip, addr.port, opts);
}

/**
 * NetSendLoopPacket
 */
function NetSendLoopPacket(socket, view) {
	// Copy buffer to loopback view.
	var loopbackView = new Uint8Array(socket.msgs[socket.send++ % MAX_LOOPBACK], 0, view.length);
	for (var i = 0; i < view.length; i++) {
		loopbackView[i] = view[i];
	}

	// Trigger a fake message event on the remote socket.
	setTimeout(function () {
		socket.remoteSocket.onmessage && socket.remoteSocket.onmessage(loopbackView);
	}, 0);
}

/**
 * NetSend
 */
function NetSend(socket, view) {
	if (socket instanceof LoopbackSocket) {
		NetSendLoopPacket(socket, view);
		return;
	}

	SYS.NetSend(socket, view);
}

/**
 * NetOutOfBandPrint
 */
function NetOutOfBandPrint(socket, type, data) {
	var msg = new BitStream(msgBuffer);

	var str = JSON.stringify({
		type: type,
		data: data
	});

	msg.writeInt32(-1);
	msg.writeASCIIString(str);

	// Create a new view representing the contents of the message.
	var msgView = new Uint8Array(msg.buffer, 0, msg.byteIndex);

	NetSend(socket, msgView);
}

/**
 * NetClose
 */
function NetClose(socket) {
	if (socket instanceof LoopbackSocket) {
		// Trigger fake close event on both the client and server
		// so they both clean up properly.
		setTimeout(function () {
			socket.onclose && socket.onclose();
		}, 0);

		if (socket.remoteSocket) {
			setTimeout(function () {
				socket.remoteSocket.onclose && socket.remoteSocket.onclose();
			}, 0);
		}
		return;
	}

	SYS.NetClose(socket);
}

/**
 * NetchanSetup
 */
function NetchanSetup(socket) {
	var netchan = new NetChan();

	netchan.socket = socket;

	return netchan;
}

/**
 * NetchanTransmit
 */
function NetchanTransmit(netchan, buffer, length) {
	var msg = new BitStream(msgBuffer);

	// Write out the buffer to our internal message buffer.
	var bufferView = new Uint8Array(buffer);

	msg.writeInt32(netchan.outgoingSequence++);

	for (var i = 0; i < length; i++) {
		msg.writeUint8(bufferView[i]);
	}

	// Create a new view representing the contents of the message.
	var msgView = new Uint8Array(msg.buffer, 0, msg.byteIndex);

	NetSend(netchan.socket, msgView);
}

/**
 * NetchanProcess
 */
function NetchanProcess(netchan, msg) {
	var sequence = msg.readInt32();
	netchan.incomingSequence = sequence;
	return true;
}