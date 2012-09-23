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

function NetChannelCreate(sock, addrstr, challenge, callback) {
	var addr = StringToAddr(addrstr);

	if (addr.type === NetAdrType.NA_LOOPBACK) {
		return new LoopbackChannel(sock, addr, challenge);
	} else {
		return new WebSocketClientChannel(addr, challenge);
	}
}

function NetChannelDestroy(netchan) {
	netchan.Close();
}