var netchan;

function NetInit() {
}

function NetFrame() {
	ProcessQueue();
}

function NetConnect(host, port) {
	if (netchan) {
		netchan.socket.Close();
		netchan = null;
	}

	var addr = StringToAddr('ws://' + host + ':' + port);
	var socket = sys.ConnectToServer(addr);
	netchan = new NetChan(addr, socket);
}

function NetSend(buffer, length) {
	if (!netchan) {
		console.warn('CL: NetSend called with uninitialized channel');
		return;
	}

	netchan.socket.SendPacket(buffer, length);
}

function ProcessQueue() {
	if (!netchan) {
		console.warn('CL: ProcessQueue called with uninitialized channel');
		return;
	}

	var packet;
	while ((packet = netchan.socket.GetPacket())) {
		PacketEvent(packet.addr, packet.buffer, packet.length);
	}
}

function PacketEvent(addr, buffer, length) {
	var bb = new ByteBuffer(buffer, ByteBuffer.LITTLE_ENDIAN);

	ExecuteServerMessage(bb);
}
