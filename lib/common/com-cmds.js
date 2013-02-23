var commands = {};

/**
 * RegisterCommands
 */
function RegisterCommands() {
	AddCmd('set',   CmdSet);
	AddCmd('unset', CmdUnset);
	AddCmd('echo',  CmdEcho);
	AddCmd('exec',  CmdExec);
	AddCmd('vstr',  CmdVstr);
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
function CmdSet(name) {
	var cvar = Cvar.GetCvar(name);

	if (!cvar) {
		// If there is no cvar for this name, create one.
		cvar = Cvar.AddCvar(name, undefined, Cvar.FLAGS.ARCHIVE | Cvar.FLAGS.USER_CREATED);
	}

	if (cvar.flags() & Cvar.FLAGS.ROM) {
		log('Can\'t modify internal cvars');
		return;
	}

	// Pull and concat value from args.
	var values = Array.prototype.slice.call(arguments, 1);
	var value = values.join(' ');

	cvar.set(value);
}

/**
 * CmdUnset
 */
function CmdUnset(name, value) {
	var cvar = Cvar.AddCvar(name);

	if (!cvar) {
		// Nothing to unset.
		return;
	}

	cvar(cvar.defaultValue());
}

/**
 * CmdEcho
 */
function CmdEcho(name) {
	var cvar = Cvar.GetCvar(name);

	if (!cvar) {
		return;
	}

	log(name, 'is:', cvar.get(), ', default:', cvar.defaultValue());
}

/**
 * CmdExec
 *
 * Callback is used by com-main to manually enforce
 * the execution order of the default config files.
 */
function CmdExec(filename, callback) {
	if (!filename) {
		log('Enter a filename to execeute.');
		return;
	}

	SYS.ReadFile(filename, 'utf8', function (err, data) {
		if (err) {
			log('Failed to execute \'' + filename + '\'');
			if (callback) {
				callback(err);
			}
			return;
		}

		log('Executing', filename);

		// Trim data.
		data = data.replace(/^\s+|\s+$/g, '');

		// Split by newline.
		var lines = data.split(/[\r\n]+|\r+|\n+/);

		for (var i = 0; i < lines.length; i++) {
			ExecuteBuffer(lines[i]);
		}

		if (callback) {
			callback();
		}
	});
}

/**
 * CmdVstr
 *
 * Inserts the current value of a variable as command text.
 */
function CmdVstr(name) {
	var cvar = Cvar.GetCvar(name);
	if (!cvar) {
		log('vstr <variablename> : execute a variable command');
		return;
	}

	ExecuteBuffer(cvar.get());
}