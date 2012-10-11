function NetInit() {
	var socket;

	socket = sys.CreateServer();

	socket.addListener('accept', function (addr, socket) {
		ClientConnect(addr, socket);
	});

	socket.addListener('close', function (addr) {
		ClientDisconnect(addr);
	});
}

function NetFrame() {
	ProcessQueue();
}

function NetSend(client, buffer, length) {
	var netchan = client.netchan;

	// TODO: The netchan stuff needs an actual interface.
	netchan.outgoingSequence++;
	
	netchan.socket.SendPacket(buffer, length);
}

function ProcessQueue() {
	for (var i = 0; i < MAX_CLIENTS; i++) {
		var client = svs.clients[i];
		if (!client || client.state < ClientState.CONNECTED) {
			continue;
		}

		var netchan = client.netchan;
		var packet;
		while ((packet = netchan.socket.GetPacket())) {
			PacketEvent(client, packet.buffer, packet.length);
		}
	}
}

function PacketEvent(client, buffer, length) {
	var bb = new ByteBuffer(buffer, ByteBuffer.LITTLE_ENDIAN);

	ExecuteClientMessage(client, bb);
}