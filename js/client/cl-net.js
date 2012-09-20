function ProcessQueue() {
	var packet;
	while ((packet = clc.netchan.GetPacket())) {
		PacketEvent(packet.buffer, packet.length);
	}
}

function PacketEvent(buffer, length) {
	var msg = new Net.ServerOp();
	msg.ParseFromStream(new PROTO.ArrayBufferStream(buffer, length));

	ParseServerMessage(msg);
}

function NetInit() {
	NetConnect('localhost', 9000);
}

function NetFrame() {
	ProcessQueue();
}

function NetConnect(host, port) {
	clc.netchan = CreateChannel(NetSrc.NS_CLIENT, 'ws://' + host + ':' + port, 0);
}

function NetSend(msg) {
	// TODO: Validate message type.
	/*if (!(msg instanceof PROTO.Message)) {
		throw new Error('Message is not an instance of PROTO.Message');
	}*/

	var serialized = new PROTO.ArrayBufferStream();
	msg.SerializeToStream(serialized);

	var buffer = serialized.getArrayBuffer();
	clc.netchan.SendPacket(buffer, serialized.length());
}