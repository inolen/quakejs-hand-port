var MAX_PACKETLEN = 1400;
var MAX_LOOPBACK  = 16;

var msgBuffer = new ArrayBuffer(MAX_MSGLEN);

var loopbacks = [
	{ msocket: null, msgs: new Array(MAX_LOOPBACK), send: 0 },
	{ msocket: null, msgs: new Array(MAX_LOOPBACK), send: 0 }
];

for (var i = 0; i < MAX_LOOPBACK; i++) {
	loopbacks[0].msgs[i] = new ArrayBuffer(MAX_MSGLEN);
	loopbacks[1].msgs[i] = new ArrayBuffer(MAX_MSGLEN);
}

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

	netchan.msocket.onclose = function () {
		if (opts.onclose) {
			opts.onclose();
		}
	};

	if (netchan.remoteAddress.type === QS.NA.LOOPBACK) {
		// Store the socket to use for future sends.
		loopbacks[src].msocket = netchan.msocket;

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
		// Trigger fake close event on both the client and server
		// so they both clean up properly.
		var err = new Error('destroyed');

		setTimeout(function () {
			var msocket = loopbacks[netchan.src].msocket;
			msocket.onclose(err);
		}, 0);

		setTimeout(function () {
			var msocket = loopbacks[netchan.src === QS.NS.CLIENT ? QS.NS.SERVER : QS.NS.CLIENT].msocket;
			msocket.onclose(err);
		}, 0);

		return;
	}

	SYS.NetClose(netchan.msocket);
}

/**
 * NetchanSendLoopPacket
 */
function NetchanSendLoopPacket(netchan, view) {
	var q = loopbacks[netchan.src];

	// Copy buffer to loopback buffer.
	var loopbackView = new Uint8Array(q.msgs[q.send++ % MAX_LOOPBACK]);
	for (var i = 0; i < view.length; i++) {
		loopbackView[i] = view[i];
	}

	// Trigger a fake message event.
	var remote_src = netchan.src === QS.NS.CLIENT ? QS.NS.SERVER : QS.NS.CLIENT;
	var msocket = loopbacks[remote_src].msocket;

	if (!msocket || !msocket.onmessage) {
		error('No loopback onmessage handler for', remote_src === QS.NS.CLIENT ? 'client' : 'server');
		return;
	}

	// Don't execute immediately.
	setTimeout(function () {
		msocket.onmessage(loopbackView);
	}, 0);
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
		return null;
	}

	addr.ip = split[0];
	addr.port = port;

	return addr;
}