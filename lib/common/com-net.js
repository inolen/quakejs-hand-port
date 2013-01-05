var MAX_PACKETLEN = 1400;
var MAX_LOOPBACK  = 16;
var loopbacks = [
	{ msgs: new Array(MAX_LOOPBACK), send: 0 },
	{ msgs: new Array(MAX_LOOPBACK), send: 0 }
];
var msgBuffer = new ArrayBuffer(MAX_MSGLEN);

/**
 * NetchanSetup
 *
 * FIXME Stop taking in addrOrSocket, we shouldn't
 * care about socket's implementation at all,
 * just pass around the reference.
 */
function NetchanSetup(src, addrOrSocket) {
	var remoteAddress;
	var socket;

	// Used by the client attempting to create a netchan to the server.
	// TODO Stop including defines files, they break instanceof comparisons.
	//if (addrOrSocket instanceof QShared.NetAdr) {
	if (addrOrSocket.type !== undefined) {
		var addr = addrOrSocket;

		if (addr.type === NA.LOOPBACK) {
			socket = { remoteAddress: addr };
		} else {
			socket = sys.NetConnectToServer(addr);
			if (!socket) {
				// Failed to connect.
				return null;
			}
		}
	} else {
		socket = addrOrSocket;
		addr = socket.remoteAddress;
	}

	var netchan = new NetChan();

	netchan.src = src;
	netchan.remoteAddress = addr;
	netchan.socket = socket;

	return netchan;
}

/**
 * NetchanDestroy
 */
function NetchanDestroy(netchan) {
	if (netchan.remoteAddress.type === NA.LOOPBACK) {
		// Trigger a fake disconnect event for loopback sockets.
		QueueEvent({ type: SE.SVSOCKCLOSE, socket: netchan.socket });
	} else {
		sys.NetClose(netchan.socket);
	}
}

/**
 * NetchanSendLoopPacket
 */
function NetchanSendLoopPacket(netchan, buffer, length) {
	var q = loopbacks[netchan.src];

	// Make a truncated copy of the incoming buffer.
	buffer = buffer.slice(0, length);

	q.msgs[q.send++ % MAX_LOOPBACK] = buffer;

	// Queue a fake packet event.
	QueueEvent({
		type: netchan.src === NS.CLIENT ? SE.SVMSG : SE.CLMSG,
		socket: netchan.socket,
		addr: netchan.remoteAddress,
		buffer: buffer,
		length: length
	});
}

/**
 * NetchanSend
 */
function NetchanSend(netchan, buffer, length) {
	var msg = new ByteBuffer(msgBuffer, ByteBuffer.LITTLE_ENDIAN);

	// Prefix packet with outgoing sequence.
	// TODO this is pretty ugly.
	var view = new Uint8Array(buffer);
	msg.writeInt(netchan.outgoingSequence++);
	for (var i = 0; i < length; i++) {
		msg.writeUnsignedByte(view[i]);
	}

	if (netchan.remoteAddress.type === NA.LOOPBACK) {
		NetchanSendLoopPacket(netchan, msg.buffer, msg.index);
		return;
	}

	sys.NetSend(netchan.socket, msg.buffer, msg.index);
}

/**
 * NetchanPrint
 */
function NetchanPrint(netchan, str) {
	var msg = new ByteBuffer(msgBuffer, ByteBuffer.LITTLE_ENDIAN);

	msg.writeInt(-1);
	msg.writeCString(str);

	if (netchan.remoteAddress.type === NA.LOOPBACK) {
		NetchanSendLoopPacket(netchan, msg.buffer, msg.index);
		return;
	}

	sys.NetSend(netchan.socket, msg.buffer, msg.index);
}

/**
 * NetchanProcess
 */
function NetchanProcess(netchan, msg) {
	var sequence = msg.readInt();
	netchan.incomingSequence = sequence;
	return true;
}

/**
 * StringToAddr
 */
function StringToAddr(str) {
	var addr = new NetAdr();

	if (str.indexOf('localhost') !== -1) {
		addr.type = NA.LOOPBACK;
		return addr;
	}

	addr.type = NA.IP;

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