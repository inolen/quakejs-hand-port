define('common/cvar', [], function () {
	var cvars = {};
	var modifiedFlags = 0;

	/******************************************************
	 *
	 * Core CVAR class
	 *
	 ******************************************************/
	function asInt(val, defaultValue) {
		val = parseInt(val, 10);
		if (isNaN(val)) {
			return defaultValue;
		}
		return val;
	}

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

	var Cvar = function (defaultValue, flags, latched) {
		this._defaultValue = typeof(defaultValue) === 'undefined' ? 0 : defaultValue;
		this._currentValue = this._defaultValue;
		this._latchedValue = this._defaultValue;
		this._flags = typeof(flags) === 'undefined' ? 0 : flags;

		// Latched cvars will only update their values on subsequent adds.
		this._latched = latched;
	};

	Cvar.prototype.getDefaultValue = function () {
		return this._defaultValue;
	};

	Cvar.prototype.at = function (index) {
		return new CvarCursor(this, index);
	};

	Cvar.prototype.modified = function () {
		if (this._latched && this._modified) {
			return true
		} else if (this._modified) {
			this._modified = false;
			return true;
		}

		return false;
	};

	Cvar.prototype.getValue = function () {
		return this._latched ? this._latchedValue : this._currentValue;
	};

	Cvar.prototype.getAsInt = function () {
		return asInt(this.getValue(), this._defaultValue);
	};

	Cvar.prototype.getAsFloat = function () {
		return asFloat(this.getValue(), this._defaultValue);
	};

	Cvar.prototype.getAsString = function () {
		return asString(this.getValue(), this._defaultValue);
	};

	Cvar.prototype.getFlags = function () {
		return this._flags;
	}

	Cvar.prototype.setValue = function (val) {
		this._currentValue = val;

		this._modified = true;

		modifiedFlags |= this._flags;
	};

	// Helper to support getting multi-value cvars.
	var CvarCursor = function (cvar, index) {
		this._cvar = cvar;
		this._index = index;
	};

	CvarCursor.prototype.getValue = function () {
		var str = this._cvar.getAsString();
		var split = str.split(',');

		for (var i = 0; i < split.length; i++) {
			split[i] = split[i].replace(/^\s*/, '').replace(/\s*$/, '');
		}

		// Use the first value if one doesn't exist for the specified index.
		if (split[this._index] === undefined && split[0] !== undefined) {
			return split[0];
		}

		return split[this._index];
	};

	CvarCursor.prototype.getAsInt = function () {
		return asInt(this.getValue(), this._cvar.getDefaultValue());
	};

	CvarCursor.prototype.getAsFloat = function () {
		return asFloat(this.getValue(), this._cvar.getDefaultValue());
	};

	CvarCursor.prototype.getAsString = function () {
		return asString(this.getValue(), this._cvar.getDefaultValue());
	};

	/******************************************************
	 *
	 *
	 *
	 ******************************************************/
	function AddCvar(name, defaultValue, flags/*, callback*/) {
		var cvar = GetCvar(name);

		if (cvar) {
			// If the user already created a cvar, update its info.
			if (typeof(defaultValue) !== 'undefined') {
				cvar._defaultValue = defaultValue;
			}
			if (typeof(flags) !== 'undefined') {
				cvar._flags = flags;
			}
			// if (typeof(callback) !== 'undefined') {
			// 	cvar._callback = callback;
			// }

			// This code path is possibly being hit because a module (e.g. cgame or game)
			// is being reinitialized, so go ahead and relatch.
			cvar._latchedValue = cvar._currentValue;
			cvar._modified = false;

			return cvar;
		}

		// Register the new cvar.
		cvar = cvars[name] = new Cvar(defaultValue, flags/*, callback*/);

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

			data[name] = cvar._currentValue;
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
		AddCvar:       AddCvar,
		GetCvar:       GetCvar,

		GetCvarJSON:   GetCvarJSON,

		Modified:      Modified,
		ClearModified: ClearModified
	};

	return exports;
});
