define('common/cvar', [], function () {
	var cvars = {};
	var modifiedFlags = 0;

	var FLAGS = {
		ROM:          1,                                         // display only, cannot be set by user at all
		ARCHIVE:      2,                                         // save to config file
		CHEAT:        4,                                         // save to config file
		USERINFO:     8,                                         // sent to server on connect or change
		SYSTEMINFO:   16,                                        // these cvars will be duplicated on all clients
		SERVERINFO:   32,                                        // sent in response to front end requests
		ARENAINFO:    64,
		USER_CREATED: 128
	};

	/******************************************************
	 *
	 * Core CVAR class
	 *
	 ******************************************************/
	function asFloat(val, defaultValue) {
		val = parseFloat(val);
		if (isNaN(val)) {
			return defaultValue;
		}
		return val;
	}

	function asString(val, defaultValue) {
		val = val.toString();
		if (val === undefined || val  === null) {
			return defaultValue;
		}
		return val;
	}

	function asDefaultType(val, defaultValue) {
		// Treat as string if no default type (e.g. user-created cvars).
		if (defaultValue === undefined) {
			return val ? val.toString() : val;
		}

		if (typeof(defaultValue) === 'number') {
			return asFloat(val, defaultValue);
		}

		return asString(val, defaultValue);
	}

	var Cvar = function (defaultValue, flags, latched) {
		this._defaultValue = defaultValue;
		this._currentValue = this._defaultValue;
		this._latchedValue = this._defaultValue;
		this._flags = flags === undefined ? 0 : flags;

		// Latched cvars will only update their values on subsequent adds.
		this._latched = latched;
	};

	Cvar.prototype.at = function (index) {
		return new CvarCursor(this, index);
	};

	Cvar.prototype.defaultValue = function () {
		return this._defaultValue;
	};

	Cvar.prototype.flags = function () {
		return this._flags;
	};

	Cvar.prototype.modified = function () {
		if (this._latched && this._modified) {
			return true;
		} else if (this._modified) {
			this._modified = false;
			return true;
		}

		return false;
	};

	Cvar.prototype.get = function (raw) {
		var val = this._latched ? this._latchedValue : this._currentValue;

		if (raw) {
			return val;
		}

		return asDefaultType(val, this._defaultValue);
	};

	Cvar.prototype.set = function (val) {
		this._currentValue = val;

		this._modified = true;

		modifiedFlags |= this._flags;
	};

	// Helper to support getting multi-value cvars.
	var CvarCursor = function (cvar, index) {
		this._cvar = cvar;
		this._index = index;
	};

	CvarCursor.prototype.get = function () {
		var str = this._cvar.get(true).toString();
		var split = str.split(',');

		for (var i = 0; i < split.length; i++) {
			split[i] = split[i].replace(/^\s*/, '').replace(/\s*$/, '');
		}

		// Use the last value if one doesn't exist for the specified index.
		var val = split[this._index];
		if (val === undefined) {
			val = split[split.length - 1];
		}

		return asDefaultType(val, this._cvar.defaultValue());
	};

	/******************************************************
	 *
	 *
	 *
	 ******************************************************/
	function AddCvar(name, defaultValue, flags, latched) {
		var cvar = GetCvar(name);

		if (cvar) {
			// If the user already created a cvar, update its info.
			if (defaultValue !== undefined) {
				cvar._defaultValue = defaultValue;
			}
			if (flags !== undefined) {
				cvar._flags = flags;
			}
			if (latched !== undefined) {
				cvar._latched = latched;
			}

			// This code path is possibly being hit because a module (e.g. cgame or game)
			// is being reinitialized, so go ahead and relatch.
			cvar._latchedValue = cvar._currentValue;
			cvar._modified = false;

			return cvar;
		}

		// Register the new cvar.
		cvar = cvars[name] = new Cvar(defaultValue, flags, latched);

		return cvar;
	}

	function GetCvar(name) {
		return cvars[name];
	}

	function GetCvarJSON(flag) {
		var data = {};

		for (var name in cvars) {
			if (!cvars.hasOwnProperty(name)) {
				continue;
			}

			var cvar = cvars[name];

			if (!(cvar._flags & flag)) {
				continue;
			}

			data[name] = cvar.get();
		}

		return data;
	}

	function Modified(flag) {
		return (modifiedFlags & flag);
	}

	function ClearModified(flag) {
		modifiedFlags &= ~flag;
	}

	var exports = {
		FLAGS:         FLAGS,

		AddCvar:       AddCvar,
		GetCvar:       GetCvar,

		GetCvarJSON:   GetCvarJSON,

		Modified:      Modified,
		ClearModified: ClearModified
	};

	return exports;
});
