var cvars = {};
var cvarModifiedFlags = 0;

/**
 * RegisterCvars
 */
function RegisterCvars() {
	AddCmd('set', CmdSet);
	AddCmd('unset', CmdUnset);
	AddCmd('echo', CmdEcho);
}

/**
 * CmdSet
 */
function CmdSet(name, value) {
	var cvar = AddCvar(name);
	cvar(value);
}

/**
 * CmdUnset
 */
function CmdUnset(name, value) {
	var cvar = AddCvar(name);
	cvar(cvar.defaultValue);
}

/**
 * CmdEcho
 */
function CmdEcho(name) {
	var cvar = FindCvar(name);
	if (!cvar) {
		return;
	}

	log(name, 'is:', cvar(), ', default:', cvar.defaultValue);
}

/**
 * Cvar
 */
var Cvar = function (defaultValue, flags/*, callback*/) {
	// Fix up the input.
	defaultValue = typeof(defaultValue) === 'undefined' ? 0 : defaultValue;
	flags = typeof(flags) === 'undefined' ? 0 : flags;

	var cvar = function (newValue) {
		if (arguments.length) {
			var oldValue = cvar.currentValue;

			// If newValue looks like a number, convert it.
			// This is quite the hack, see:
			// http://stackoverflow.com/questions/175739/is-there-a-built-in-way-in-javascript-to-check-if-a-string-is-a-valid-number
			if (!isNaN(newValue)) {
				// At this point, newValue could be '12.345' or 12.345.
				// Using +newValue will automatically convert either into
				// their proper numerical type.
				cvar.currentValue = +newValue;
			} else {
				cvar.currentValue = newValue;
			}

			// // Trigger callback if specified.
			// if (cvar.callback) {
			// 	cvar.callback();
			// }

			// TODO remove this and convert to some sort of default callback.
			cvarModifiedFlags |= cvar.flags;
		} else {
			if (flags & CVF.LATCH) {
				return cvar.latchedValue;
			} else {
				return cvar.currentValue;
			}
		}
	};

	cvar.defaultValue = defaultValue;
	cvar.currentValue = defaultValue;
	cvar.latchedValue = defaultValue;
	cvar.flags = flags;
	// cvar.callback = callback;

	return cvar;
};

/**
 * AddCvar
 */
function AddCvar(name, defaultValue, flags/*, callback*/) {
	var cvar = FindCvar(name);

	if (cvar) {
		// If the user already created a cvar, update its info.
		if (typeof(defaultValue) !== 'undefined') {
			cvar.defaultValue = defaultValue;
		}

		if (typeof(flags) !== 'undefined') {
			cvar.flags = flags;
		}

		// if (typeof(callback) !== 'undefined') {
		// 	cvar.callback = callback;
		// }

		// This code path is possibly being hit because a module (e.g. cgame or game)
		// is being reinitialized.
		RelatchCvar(name);

		return cvar;
	}

	// Register the new cvar.
	cvar = cvars[name] = new Cvar(defaultValue, flags/*, callback*/);

	return cvar;
}

/**
 * FindCvar
 */
function FindCvar(name) {
	return cvars[name];
}

/**
 * GetCvarVal
 */
function GetCvarVal(name) {
	var cvar = FindCvar(name);
	if (!cvar) {
		return null;
	}

	return cvar();
}

/**
 * SetCvarVal
 */
function SetCvarVal(name, value) {
	CmdSet(name, value);
}

/**
 * RelatchCvar
 */
function RelatchCvar(name) {
	var cvar = FindCvar(name);
	if (!cvar) {
		return false;
	}

	if (cvar.latchedValue === cvar.currentValue) {
		return false;
	}

	cvar.latchedValue = cvar.currentValue;
	return true;
}

/**
 * GetCvarValues
 */
function GetCvarValues(flag) {
	var data = {};

	for (var name in cvars) {
		if (!cvars.hasOwnProperty(name)) {
			continue;
		}

		var cvar = cvars[name];

		if (!(cvar.flags & flag)) {
			continue;
		}

		data[name] = cvar();
	}

	return data;
}

/**
 * WriteCvars
 */
function WriteCvars(str) {
	for (var name in cvars) {
		if (!cvars.hasOwnProperty(name)) {
			continue;
		}

		var cvar = cvars[name];

		if (!(cvar.flags & CVF.ARCHIVE)) {
			continue;
		}

		str += 'set ' + name + ' ' + cvar() + '\n';
	}

	return str;
}