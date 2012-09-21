var netchan;

function NetInit() {
	var chan = NetChannelCreate(NetSrc.NS_SERVER, 'ws://localhost:9000', 0);

	chan.addListener('open', function () {
		netchan = chan;
	});

	chan.addListener('accept', function (netchan) {
		console.log('SV: Accepting incoming client connection.');
		DirectConnect(netchan);
	});
}

function NetFrame() {
	ProcessQueue();
}

function NetSend(msg) {
	if (!netchan) {
		console.warn('SV: NetSend called with uninitialized channel');
		return;
	}

	// TODO: Validate message type.
	/*if (!(msg instanceof PROTO.Message)) {
		throw new Error('Message is not an instance of PROTO.Message');
	}*/

	var serialized = new PROTO.ArrayBufferStream();
	msg.SerializeToStream(serialized);

	var buffer = serialized.getArrayBuffer();
	netchan.SendPacket(buffer, serialized.length());
}

function ProcessQueue() {
	if (!netchan) {
		console.warn('SV: ProcessQueue called with uninitialized channel');
		return;
	}

	var packet;
	while ((packet = netchan.GetPacket())) {
		PacketEvent(packet.addr, packet.buffer, packet.length);
	}
}

function PacketEvent(addr, buffer, length) {
	var msg = new Net.ClientOp();
	msg.ParseFromStream(new PROTO.ArrayBufferStream(buffer, length));

	for (var i = 0; i < clients.length; i++) {
		var cl = clients[i];

		if (!_.isEqual(cl.netchan.addr, addr)) {
			continue;
		}

		ParseClientMessage(cl, msg);
		break;
	}
}

function ParseClientMessage(cl, msg) {
	//console.log('parsing client message from', cl);

	if (msg.type === Net.ClientOp.Type.move) {
		UserMove(cl, msg.clop_move);
	}
}