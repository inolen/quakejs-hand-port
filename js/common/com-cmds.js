var commands = {};

/**
 * InitCmd
 */
function RegisterCommands() {
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
 * CmdExec
 */
function CmdExec(filename) {
	sys.ReadFile(filename, 'utf8', function (err, data) {
		if (err) {
			console.warn('Failed to execute \'' + filename + '\'');
			return;
		}

		// Trim data.
		data = data.replace(/^\s+|\s+$/g, '');

		// Split by newline.
		var lines = data.split(/\r\n|\r|\n/);

		for (var i = 0; i < lines.length; i++) {
			ExecuteCmdText(lines[i]);
		}
	});
}