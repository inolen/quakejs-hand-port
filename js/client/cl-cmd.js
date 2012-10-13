function CmdInit() {
	com.AddCmd('connect', CmdConnect);
}

function CmdConnect(serverName) {
	var parts = serverName.split(':');
	var host = parts[0];
	var port = parts[1];

	if (clc.netchan) {
		com.NetchanDestroy(netchan);
		clc.netchan = null;
	}

	var addr = StringToAddr('ws://' + host + ':' + port);
	clc.netchan = com.NetchanSetup(NetSrc.CLIENT, addr);
}