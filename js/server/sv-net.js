var channel;

function ProcessQueue() {
	var packet;
	while ((packet = channel.GetPacket())) {
		PacketEvent(packet.buffer, packet.length);
	}
}

function PacketEvent(buffer, length) {
	var msg = new Net.ClientOp();
	msg.ParseFromStream(new PROTO.ArrayBufferStream(buffer, length));

	ParseClientMessage(msg);
}

function ParseClientMessage(msg) {
	if (msg.type === Net.ClientOp.Type.move) {
		UserMove(msg.clop_move);
	}
}

function NetInit() {
	channel = CreateChannel(NetSrc.NS_SERVER, 'ws://localhost:9000', 0);
}

function NetFrame() {
	ProcessQueue();
}

// All communication is done with Protocol Buffers.
function NetSend(msg) {
	// TODO: Validate message type.
	/*if (!(msg instanceof PROTO.Message)) {
		throw new Error('Message is not an instance of PROTO.Message');
	}*/

	var serialized = new PROTO.ArrayBufferStream();
	msg.SerializeToStream(serialized);

	var buffer = serialized.getArrayBuffer();
	channel.SendPacket(buffer, serialized.length());
}