var commands = {};

/**
 * RegisterCommands
 */
function RegisterCommands() {
	AddCmd('exec', CmdExec);
	AddCmd('+debugtest', function () { window.debugtest = true; });
	AddCmd('-debugtest', function () { window.debugtest = false; });
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
 *
 * Callback is used by com-main to manually enforce
 * the execution order of the default config files.
 */
function CmdExec(filename, callback) {
	if (!filename) {
		console.log('Enter a filename to execeute.');
		return;
	}

	log('Executing', filename);

	sys.ReadFile(filename, 'utf8', function (err, data) {
		if (err) {
			log('Failed to execute \'' + filename + '\'');
			if (callback) {
				callback(err);
			}
			return;
		}

		// Trim data.
		data = data.replace(/^\s+|\s+$/g, '');

		// Split by newline.
		var lines = data.split(/\r\n|\r|\n/);

		for (var i = 0; i < lines.length; i++) {
			ExecuteBuffer(lines[i]);
		}

		if (callback) {
			callback();
		}
	});
}