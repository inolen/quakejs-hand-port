var loopback;

function StringToAddr(str) {
	var addr = Object.create(NetAdr);

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

function CreateChannel(sock, addrstr, challenge) {
	var addr = StringToAddr(addrstr);

	if (addr.type === NetAdrType.NA_LOOPBACK) {
		if (!loopback) {
			loopback = new LoopbackChannel(sock, challenge);
		}

		return sock === NetSrc.NS_CLIENT ?
			loopback.Client :
			loopback.Server;
	} else {
		return new WebSocketClientChannel(addr, challenge);
	}
}