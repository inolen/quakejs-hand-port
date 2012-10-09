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
	var socket;

	if (addr.type === NetAdrType.NA_LOOPBACK) {
		socket = LoopbackSocket.ConnectToServer();
	} else {
		socket = new WebSocketClientChannel(addr);
	}

	netchan = new NetChan(addr, socket);
}

function StringToAddr(str) {
	var addr = new NetAdr();

	if (str.indexOf('localhost') !== -1) {
		addr.type = NetAdrType.NA_LOOPBACK;
	} else {
		addr.type = NetAdrType.NA_IP;
	}

	// TODO: Add a default port support.
	var ip = str;
	var m = ip.match(/\/\/(.+)\:(\d+)/);
	if (m) {
		addr.ip = m[1];
		addr.port = m[2];
	}

	return addr;
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

	msg.serverId = parseInt(cl.gameState['sv_serverid']);
	// Set the last message we received, which can be used for delta compression,
	// and is also used to tell if we dropped a gamestate.
	msg.messageAcknowledge = clc.serverMessageSequence;

	var serialized = new PROTO.ArrayBufferStream();
	msg.SerializeToStream(serialized);

	var buffer = serialized.getArrayBuffer();
	netchan.socket.SendPacket(buffer, serialized.length());
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
	var msg = new Net.ServerOp();
	msg.ParseFromStream(new PROTO.ArrayBufferStream(buffer, length));
	ExecuteServerMessage(msg);
}
