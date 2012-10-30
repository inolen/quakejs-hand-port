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
function NetchanSetup(src, addr, socket) {
	var netchan = new NetChan();

	netchan.src = src;
	netchan.addr = addr;

	if (typeof (socket) !== 'undefined') {
		netchan.socket = socket;
	} else if (addr.type === NetAdrType.LOOPBACK) {
		// Trigger a fake connect event for loopback sockets.
		//QueueEvent({ type: EventTypes.NETSVCONNECT, addr: addr, socket: null });
	} else {
		netchan.socket = sys.NetConnectToServer(addr);
	}

	return netchan;
}

/**
 * NetchanDestroy
 */
function NetchanDestroy(netchan) {
	if (netchan.addr.type === NetAdrType.LOOPBACK) {
		// Trigger a fake disconnect event for loopback sockets.
		//QueueEvent({ type: EventTypes.NETSVDISCONNECT, addr: netchan.addr });
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
		socket: null,
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