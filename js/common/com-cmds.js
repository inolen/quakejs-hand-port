var commands = {};

/**
 * InitCmd
 */
function InitCmds() {
	AddCmd('exec', CmdExec);
}

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

	console.log('Executing', str);

	if ((callback = GetCmd(cmdstr))) {
		callback.apply(this, args);
	}
}

/**
 * CmdExec
 */
function CmdExec(filename) {
	sys.ReadFile(filename, 'utf8', function (err, data) {
		// Trim data.
		data = data.replace(/^\s+|\s+$/g, '');

		// Split by newline.
		var lines = data.split(/\r\n|\r|\n/);

		for (var i = 0; i < lines.length; i++) {
			ExecuteCmdText(lines[i]);
		}
	});
}