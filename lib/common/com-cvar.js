var cvars = {};

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

			cvar.modified = true;
		} else {
			return currentValue;
		}
	};

	cvar.flags = flags;
	cvar.modified = false;

	return cvar;
};

/**
 * AddCvar
 */
function AddCvar(name, defaultValue, flags) {
	var cvar = cvars[name];

	if (!cvar) {
		if (typeof(defaultValue) === 'undefined') {
			return null;
		} else {
			cvar = cvars[name] = new Cvar(defaultValue, flags || 0);
		}
	}

	return cvar;
}

/**
 * GetCvar
 */
function GetCvar(name, defaultValue, flags) {
	var cvar = cvars[name];
	return cvar;
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
 * AddCvarKeyValues
 */
function AddCvarKeyValues(flag) {
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

		str += name + ' ' + cvar() + '\n';
	}

	return str;
}