var MAX_PACKETLEN = 1400;
var MAX_LOOPBACK  = 16;
var loopbacks = [
	{ msgs: new Array(MAX_LOOPBACK), send: 0 },
	{ msgs: new Array(MAX_LOOPBACK), send: 0 }
];
var msgBuffer = new ArrayBuffer(MAX_MSGLEN);

/**
 * NetchanSetup
 */
function NetchanSetup(src, addrOrSocket) {
	var netchan = new NetChan();

	var addr;
	var socket;

	// TODO Stop including defines files, they break instanceof comparisons.
	//if (addrOrSocket instanceof NetAdr) {
	if (addrOrSocket.type !== undefined) {
		addr = addrOrSocket;

		if (addr.type === NetAdrType.LOOPBACK) {
			socket = { remoteAddress: addr };
		} else {
			socket = sys.NetConnectToServer(addr);
		}
	} else {
		socket = addrOrSocket;
		// TODO Parse this into a NetAdr.
		addr = socket.remoteAddress;
	}

	netchan.src = src;
	netchan.addr = addr;
	netchan.socket = socket;

	return netchan;
}

/**
 * NetchanDestroy
 */
function NetchanDestroy(netchan) {
	if (netchan.addr.type === NetAdrType.LOOPBACK) {
		// Trigger a fake disconnect event for loopback sockets.
		QueueEvent({ type: EventTypes.NETSVCLOSED, socket: netchan.socket });
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

	QueueEvent({
		type: netchan.src === NetSrc.CLIENT ? EventTypes.NETSVMESSAGE : EventTypes.NETCLMESSAGE,
		socket: netchan.socket,
		addr: netchan.addr,
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

	if (netchan.addr.type === NetAdrType.LOOPBACK) {
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

	if (netchan.addr.type === NetAdrType.LOOPBACK) {
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