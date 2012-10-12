var MAX_PACKETLEN = 1400;
var MAX_LOOPBACK  = 16;
var loopbacks = [
	{ msgs: new Array(MAX_LOOPBACK), send: 0 },
	{ msgs: new Array(MAX_LOOPBACK), send: 0 },
];

function NetchanSetup(src, addr, socket) {
	var netchan = new NetChan();

	netchan.src = src;
	netchan.addr = addr;

	if (typeof (socket) !== 'undefined') {
		netchan.socket = socket;
	} else if (addr.type == NetAdrType.NA_LOOPBACK) {
		// Trigger a fake connect event for loopback sockets.
		QueueEvent({ type: EventTypes.NETCONNECT, addr: addr, socket: null });
	} else {
		netchan.socket = sys.NetConnectToServer(addr);
	}

	return netchan;
}

function NetchanDestroy(netchan) {
	if (netchan.addr.type == NetAdrType.NA_LOOPBACK) {
		// Trigger a fake disconnect event for loopback sockets.
		QueueEvent({ type: EventTypes.NETDISCONNECT, addr: netchan.addr });
	} else {
		sys.NetClose(netchan.socket);
	}
}

function NetchanSendLoopPacket(netchan, buffer) {
	var q = loopbacks[netchan.src];

	var i = q.send++ & (MAX_LOOPBACK-1);
	q.msgs[i] = buffer;

	QueueEvent({
		type: netchan.src === NetSrc.CLIENT ? EventTypes.NETSVMESSAGE : EventTypes.NETCLMESSAGE,
		addr: netchan.addr,
		buffer: buffer
	});
}

function NetchanSend(netchan, buffer) {
	netchan.outgoingSequence++;

	if (netchan.addr.type === NetAdrType.NA_LOOPBACK) {
		NetchanSendLoopPacket(netchan, buffer);
		return;
	}

	sys.NetSend(netchan.socket, buffer);
}