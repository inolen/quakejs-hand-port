var MAX_PACKETLEN = 1400;
var MAX_LOOPBACK  = 16;
var loopbacks = [
	{ msgs: new Array(MAX_LOOPBACK), send: 0 },
	{ msgs: new Array(MAX_LOOPBACK), send: 0 }
];
var loopbackHandlers = [];
var msgBuffer = new ArrayBuffer(MAX_MSGLEN);

/**
 * NetchanSetup
 */
var netchanId = 0;

function NetchanSetup(src, addrOrSocket, opts) {
	var netchan = new NetChan();

	netchan.src = src;

	// If an address structure was passed in, create
	// the socket handle.
	if (addrOrSocket instanceof QS.NetAdr) {
		netchan.remoteAddress = addrOrSocket;

		// Create an empty object for loopback sockets so event handlers
		// can still be set.
		if (netchan.remoteAddress.type === QS.NA.LOOPBACK) {
			netchan.msocket = {};
		} else {
			netchan.msocket = SYS.NetConnect(netchan.remoteAddress);
		}
	}
	// The server initializes channels with a valid socket
	// for connected clients.
	else {
		// We don't need the actual ip / port (we already have a socket
		// handle), but set the correct address type.
		var addr = new QS.NetAdr();
		addr.type = QS.NA.IP;

		netchan.remoteAddress = addr;
		netchan.msocket = addrOrSocket;
	}

	// Persist the system-level events to the optional event handlers.
	netchan.msocket.onopen = function () {
		netchan.ready = true;
		if (opts.onopen) {
			opts.onopen();
		}
	};

	netchan.msocket.onmessage = function (buffer) {
		if (opts.onmessage) {
			opts.onmessage(buffer);
		}
	};

	netchan.msocket.onclose = function (err) {
		if (opts.onclose) {
			opts.onclose(err);
		}
	};

	if (netchan.remoteAddress.type === QS.NA.LOOPBACK) {
		// Store the onmessage handler to use during future sends.
		loopbackHandlers[src] = netchan.msocket.onmessage;

		// Go ahead and trigger a fake open event.
		netchan.msocket.onopen();
	}

	return netchan;
}

/**
 * NetchanDestroy
 */
function NetchanDestroy(netchan) {
	netchan.ready = false;

	if (netchan.remoteAddress.type === QS.NA.LOOPBACK) {
		return;
	}

	SYS.NetClose(netchan.msocket);
}

/**
 * NetchanSendLoopPacket
 */
function NetchanSendLoopPacket(netchan, buffer) {
	var q = loopbacks[netchan.src];

	q.msgs[q.send++ % MAX_LOOPBACK] = buffer;

	// Trigger a fake message event.
	var remote_src = netchan.src === QS.NS.CLIENT ? QS.NS.SERVER : QS.NS.CLIENT;
	var handler = loopbackHandlers[remote_src];

	if (!handler) {
		error('No loopback handler for', remote_src === QS.NS.CLIENT ? 'client' : 'server');
		return;
	}

	handler(buffer);
}

/**
 * NetchanSend
 */
function NetchanSend(netchan, buffer, length) {
	var msg = new BitStream(msgBuffer);

	// Write out the buffer to our internal message buffer.
	var bufferView = new Uint8Array(buffer);

	msg.writeInt32(netchan.outgoingSequence++);

	for (var i = 0; i < length; i++) {
		msg.writeUint8(bufferView[i]);
	}

	// Create a new view representing the contents of the message.
	var msgView = new Uint8Array(msg.buffer, 0, msg.byteIndex);

	if (netchan.remoteAddress.type === QS.NA.LOOPBACK) {
		NetchanSendLoopPacket(netchan, msgView);
		return;
	}

	SYS.NetSend(netchan.msocket, msgView);
}

/**
 * NetchanPrint
 */
function NetchanPrint(netchan, str) {
	var msg = new BitStream(msgBuffer);

	msg.writeInt32(-1);
	msg.writeASCIIString(str);

	// Create a new view representing the contents of the message.
	var msgView = new Uint8Array(msg.buffer, 0, msg.byteIndex);

	if (netchan.remoteAddress.type === QS.NA.LOOPBACK) {
		NetchanSendLoopPacket(netchan, msgView);
		return;
	}

	SYS.NetSend(netchan.msocket, msgView);
}

/**
 * NetchanProcess
 */
function NetchanProcess(netchan, msg) {
	var sequence = msg.readInt32();
	netchan.incomingSequence = sequence;
	return true;
}

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
		return addr;
	}

	addr.type = QS.NA.IP;

	var split = str.split(':');
	if (!split.length) {
		return null;
	}

	var port = parseInt(split[1], 10);
	if (isNaN(port)) {
		return null;
	}

	addr.ip = split[0];
	addr.port = port;

	return addr;
}