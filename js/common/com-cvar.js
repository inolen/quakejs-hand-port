var cvars = {};

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

function CvarAdd(name, defaultValue, changeCallback) {
	var cvar = new Cvar(defaultValue, changeCallback);
	cvars[name] = cvar;
	return cvar;
};

function CvarGet(name) {
	var cvar = cvars[name];

	if (!cvar) {
		console.warn('COM: No cvar found for \'' + name + '\'');
		return null;
	}

	return cvar();
}

function CvarSet(name, value) {
	var cvar = cvars[name];

	if (!cvar) {
		console.warn('COM: No cvar found for \'' + name + '\'');
		return;
	}

	cvar(value);
}