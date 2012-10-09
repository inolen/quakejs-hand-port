function NetInit() {
	var socket;

	if (true) {
		socket = LoopbackSocket.ConnectToClient();
	} else {
	}

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

function NetSend(client, msg) {
	var netchan = client.netchan;

	// TODO: Validate message type.
	/*if (!(msg instanceof PROTO.Message)) {
		throw new Error('Message is not an instance of PROTO.Message');
	}*/

	// TODO: The netchan stuff needs an actual interface.
	msg.serverMessageSequence = netchan.outgoingSequence;
	netchan.outgoingSequence++;

	var serialized = new PROTO.ArrayBufferStream();
	msg.SerializeToStream(serialized);

	var buffer = serialized.getArrayBuffer();
	netchan.socket.SendPacket(buffer, serialized.length());
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
	var msg = new Net.ClientOp();
	msg.ParseFromStream(new PROTO.ArrayBufferStream(buffer, length));

	ExecuteClientMessage(client, msg);
}