var commands = {};

function AddCmd(cmd, callback) {
	commands[cmd] = callback;
}

function GetCmd(cmd) {
	return commands[cmd];
}