function CmdInit() {
	com.CmdAdd('connect', CmdConnect);
}

function CmdConnect(serverName) {
	console.log('command connect: ' + serverName);
}