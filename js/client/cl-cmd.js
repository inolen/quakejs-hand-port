function CmdInit() {
	cmd.AddCmd('connect', CmdConnect);
}

function CmdConnect(serverName) {
	console.log('whuttup');
	var parts = serverName.split(':');
	NetConnect(parts[0], parts[1]);
}