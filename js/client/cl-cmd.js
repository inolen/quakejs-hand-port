function InitCmd() {
	com.AddCmd('connect', ConnectCmd);
}

function ConnectCmd(serverName) {
	var parts = serverName.split(':');
	var host = parts[0];
	var port = parts[1];

	Disconnect(false);

	/*Q_strncpyz( clc.servername, server, sizeof(clc.servername) );

	if (!NET_StringToAdr(clc.servername, &clc.serverAddress, family) ) {
		Com_Printf ("Bad server address\n");
		clc.state = CA_DISCONNECTED;
		return;
	}
	if (clc.serverAddress.port == 0) {
		clc.serverAddress.port = BigShort( PORT_SERVER );
	}

	serverString = NET_AdrToStringwPort(clc.serverAddress);

	Com_Printf( "%s resolved to %s\n", clc.servername, serverString);*/

	var addr = StringToAddr('ws://' + host + ':' + port);
	clc.netchan = com.NetchanSetup(NetSrc.CLIENT, addr);
	clc.state = ConnectionState.CHALLENGING;

	/*clc.connectTime = -99999;	// CL_CheckForResend() will fire immediately
	clc.connectPacketCount = 0;*/
}

function StringToAddr(str) {
	var addr = new NetAdr();

	if (str.indexOf('localhost') !== -1) {
		addr.type = NetAdrType.LOOPBACK;
	} else {
		addr.type = NetAdrType.IP;
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
