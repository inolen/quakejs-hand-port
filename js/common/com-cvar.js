var cvars = {};

// TODO move to com-defines.
function Cvar(defaultValue, changeCallback) {
	var currentValue = defaultValue;

	return function (newValue) {
		this.modified = false;

		if (arguments.length) {
			var oldValue = currentValue;
			currentValue = newValue;
			//this.modified = true;
			if (changeCallback) {
				changeCallback(currentValue, oldValue);
			}
		} else {
			return currentValue;
		}
	};
}

/**
 * AddCvar
 */
function AddCvar(name, defaultValue, changeCallback) {
	var cvar = new Cvar(defaultValue, changeCallback);
	cvars[name] = cvar;
	return cvar;
};

/**
 * GetCvar
 */
function GetCvar(name) {
	var cvar = cvars[name];

	if (!cvar) {
		console.warn('COM: No cvar found for \'' + name + '\'');
		return null;
	}

	return cvar();
}

/**
 * SetCvar
 */
function SetCvar(name, value) {
	var cvar = cvars[name];

	if (!cvar) {
		console.warn('COM: No cvar found for \'' + name + '\'');
		return;
	}

	cvar(value);
}