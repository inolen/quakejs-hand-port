var commands = {};

/**
 * RegisterCommands
 */
function RegisterCommands() {
	AddCmd('set',   CmdSet);
	AddCmd('unset', CmdUnset);
	AddCmd('echo',  CmdEcho);
	AddCmd('exec',  CmdExec);
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
 * CmdSet
 */
function CmdSet(name, value) {
	var cvar = Cvar.AddCvar(name);

	if (cvar.getFlags() & QS.CVAR.ROM) {
		log('Can\'t modify internal cvars');
		return;
	}

	cvar.setValue(value);
}

/**
 * CmdUnset
 */
function CmdUnset(name, value) {
	var cvar = Cvar.AddCvar(name);
	cvar(cvar.getDefaultValue());
}

/**
 * CmdEcho
 */
function CmdEcho(name) {
	var cvar = Cvar.GetCvar(name);
	if (!cvar) {
		return;
	}

	log(name, 'is:', cvar.getValue(), ', default:', cvar.getDefaultValue());
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

	sys.ReadFile(filename, 'utf8', function (err, data) {
		if (err) {
			log('Failed to execute \'' + filename + '\'');
			if (callback) {
				callback(err);
			}
			return;
		}

		// log('Executing', filename, data);

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