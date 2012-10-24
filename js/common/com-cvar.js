var cvars = {};

/**
 * AddCvar
 */
function AddCvar(name, defaultValue) {
	var cvar = new Cvar(defaultValue);
	cvars[name] = cvar;
	return cvar;
};

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
 * WriteCvars
 */
function WriteCvars(str) {
	for (var name in cvars) {
		if (!cvars.hasOwnProperty(name)) {
			continue;
		}

		str += name + ' ' + cvars[name]() + '\n';
	}

	return str;
}