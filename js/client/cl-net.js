var netchan;

function NetInit() {
	NetConnect('localhost', 9000);
}

function NetFrame() {
	ProcessQueue();
}

function NetConnect(host, port) {
	var chan = com.NetChannelCreate(NetSrc.NS_CLIENT, 'ws://' + host + ':' + port, 0);

	chan.addListener('open', function () {
		netchan = chan;
	});
}

function NetSend(msg) {
	if (!netchan) {
		console.warn('CL: NetSend called with uninitialized channel');
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
		console.warn('CL: ProcessQueue called with uninitialized channel');
		return;
	}

	var packet;
	while ((packet = netchan.GetPacket())) {
		PacketEvent(packet.addr, packet.buffer, packet.length);
	}
}

function PacketEvent(addr, buffer, length) {
	var msg = new Net.ServerOp();
	msg.ParseFromStream(new PROTO.ArrayBufferStream(buffer, length));

	ParseServerMessage(msg);
}
