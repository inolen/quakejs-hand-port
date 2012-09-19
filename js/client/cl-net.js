function ProcessQueue() {
	// manually send packet events for the loopback channel
	var msg;
	while ((msg = clc.netchan.GetPacket())) {
		PacketEvent(msg);
	}
}

function PacketEvent(msg) {
	ParseServerPacket(msg);
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

function NetSend(type, struct) {
	var buffer = new ArrayBuffer(1 + struct.byteLength);
	var view = new DataView(buffer, 0);

	view.setUint8(0, type, true);
	struct.serialize(buffer, 1);

	clc.netchan.SendPacket(buffer);
}