var commands = {};

function CmdAdd(cmd, callback) {
	commands[cmd] = callback;
}

function CmdGet(cmd) {
	return commands[cmd];
}