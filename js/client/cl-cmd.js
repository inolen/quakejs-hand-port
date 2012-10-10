function CmdInit() {
	cmd.AddCmd('connect', CmdConnect);
}

function CmdConnect(serverName) {
	console.log('command connect: ' + serverName);
}