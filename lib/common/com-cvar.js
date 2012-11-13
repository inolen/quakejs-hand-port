var cvars = {};

/**
 * AddCvar
 */
function AddCvar(name, defaultValue, flags) {
	var cvar = new sh.Cvar(defaultValue, flags || 0);
	cvars[name] = cvar;
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
 * GetCvarKeyValues
 */
function GetCvarKeyValues(flag) {
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

		if (!(cvar.flags & sh.CvarFlags.ARCHIVE)) {
			continue;
		}

		str += name + ' ' + cvar() + '\n';
	}

	return str;
}