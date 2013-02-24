var commands = {};

/**
 * RegisterCommands
 */
function RegisterCommands() {
	AddCmd('set',   CmdSet);
	AddCmd('unset', CmdUnset);
	AddCmd('echo',  CmdEcho);
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