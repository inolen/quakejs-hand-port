var cvars = {};
var cvar_modifiedFlags = 0;

/**
 * Cvar
 */
var Cvar = function (defaultValue, flags) {
	var currentValue = defaultValue;
	var cvar = function (newValue) {
		if (arguments.length) {
			var oldValue = currentValue;

			// Convert the new value to the same type
			// as the default value.
			if (typeof(defaultValue) === 'string') {
				currentValue = newValue.toString();
			} else if (defaultValue % 1 === 0) {
				currentValue = parseInt(newValue, 10);
			} else {
				currentValue = parseFloat(newValue);
			}

			cvar_modifiedFlags |= cvar.flags;

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
 * InitCvar
 */
function InitCvar() {
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
 * Not a registered command, but called by ExecuteCmdText.
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
	var cvar = cvars[name];

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
	var cvar = cvars[name];

	if (!cvar) {
		console.warn('COM: No cvar found for \'' + name + '\'');
		return;
	}

	cvar(value);
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