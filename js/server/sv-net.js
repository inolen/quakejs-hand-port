var netchan;

function NetInit() {
	var chan = com.NetChannelCreate(NetSrc.NS_SERVER, 'ws://localhost:9000', 0);

	chan.addListener('open', function () {
		netchan = chan;
	});

	// TODO This accept/close is clearly some perfect world bullshit,
	// we'll have to fix this once we add in real networking.
	chan.addListener('accept', function (netchan) {
		console.log('SV: Accepting incoming client connection', netchan);
		ClientConnect(netchan);
	});

	chan.addListener('close', function (netchan) {
		console.log('SV: Closing connection for', netchan);

		var client = GetClientForAddr(netchan.addr);
		ClientDisconnect(client);
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

	// TODO: The netchan stuff needs an actual interface.
	if (typeof netchan.outgoingSequence === 'undefined') netchan.outgoingSequence = 0;
	msg.serverMessageSequence = netchan.outgoingSequence;
	netchan.outgoingSequence++;

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

	var client = GetClientForAddr(addr);
	ExecuteClientMessage(client, msg);
}

function GetClientForAddr(addr) {
	for (var i = 0; i < svs.clients.length; i++) {
		var client = svs.clients[i];

		if (_.isEqual(client.netchan.addr, addr)) {
			return client;
		}
	}

	return client;
}