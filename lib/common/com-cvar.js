var cvars = {};
var cvarModifiedFlags = 0;

/**
 * Cvar
 */
var Cvar = function (defaultValue, flags) {
	var currentValue = defaultValue;
	var cvar = function (newValue) {
		if (arguments.length) {
			var oldValue = currentValue;

			// If newValue looks like a number, convert it.
			// This is quite the hack, see:
			// http://stackoverflow.com/questions/175739/is-there-a-built-in-way-in-javascript-to-check-if-a-string-is-a-valid-number
			if (!isNaN(newValue)) {
				// At this point, newValue could be '12.345' or 12.345.
				// Using +newValue will automatically convert either into
				// their proper numerical type.
				currentValue = +newValue;
			} else {
				currentValue = newValue;
			}

			cvarModifiedFlags |= cvar.flags;

			cvar.modified = true;
		} else {
			return currentValue;
		}
	};

	cvar.defaultValue = defaultValue;
	cvar.flags = flags;
	cvar.modified = false;

	return cvar;
};

/**
 * RegisterCvars
 */
function RegisterCvars() {
	AddCmd('set', CmdSet);
	AddCmd('unset', CmdUnset);
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
 * CmdCvar
 *
 * Not a registered command, but called by ExecuteBuffer.
 */
function CmdCvar(name, value) {
	var cvar = FindCvar(name);

	if (!cvar) {
		return;
	}

	// If a value wasn't specified, print out info.
	if (typeof(value) === 'undefined') {
		PrintCvar(name);
		return;
	}

	// Otherwise, set the value.
	CmdSet(name, value);
}

/**
 * AddCvar
 */
function AddCvar(name, defaultValue, flags) {
	var cvar = cvars[name];

	if (cvar) {
		// If the user already created a cvar, update its default value and OR
		// the new flags.
		if (typeof(defaultValue) !== 'undefined') {
			cvar.defaultValue = defaultValue;
		}

		if (typeof(flags) !== 'undefined') {
			cvar.flags |= flags;
		}

		return cvar;
	}

	// Register the new cvar.
	cvar = cvars[name] = new Cvar(defaultValue || 0, flags || 0);

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
		console.warn('COM: No cvar found for \'' + name + '\'');
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
 * PrintCvar
 *
 * Prints the value, default, and latched string of the given variable.
 */
function PrintCvar(name) {
	var cvar = FindCvar(name);
	log(name, 'is:', cvar(), ', default:', cvar.defaultValue);
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