function CreateServer(addr) {
	var socket = LoopbackSocket.ConnectToClient();

	return socket;
}

function ConnectToServer(addr) {
	var socket;

	if (addr.type === NetAdrType.NA_LOOPBACK) {
		socket = LoopbackSocket.ConnectToServer();
	} else {
		socket = new WebSocketClient(addr);
	}

	return socket;
}