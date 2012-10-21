var commands = {};

/**
 * AddCmd
 */
function AddCmd(cmd, callback) {
	commands[cmd] = callback;
}

/**
 * GetCmd
 */
function GetCmd(cmd) {
	return commands[cmd];
}

/**
 * ExecuteCmdText
 */
function ExecuteCmdText(str) {
	var split = str.split(' ');
	var cmdstr = split[0];
	var args = split.slice(1);
	var callback;

	if ((callback = GetCmd(cmdstr))) {
		callback.apply(this, args);
	}
}