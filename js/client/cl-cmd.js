function CmdInit() {
	CmdAdd('connect', CmdConnect);
}

function CmdConnect(serverName) {
	console.log('command connect: ' + serverName);
}