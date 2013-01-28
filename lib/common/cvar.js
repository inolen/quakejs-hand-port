define('common/cvar', [], function () {
	var cvars = {};
	var modifiedFlags = 0;

	/******************************************************
	 *
	 * Core CVAR class
	 *
	 ******************************************************/
	var Cvar = function (defaultValue, flags, latched) {
		this._defaultValue = typeof(defaultValue) === 'undefined' ? 0 : defaultValue;
		this._currentValue = this._defaultValue;
		this._latchedValue = this._defaultValue;
		this._flags = typeof(flags) === 'undefined' ? 0 : flags;

		// Latched cvars will only update their values on subsequent adds.
		this._latched = latched;
	};

	Cvar.prototype._getValue = function () {
		return this._latched ? this._latchedValue : this._currentValue;
	};

	Cvar.prototype.modified = function () {
		if (this._latched) {
			return this._defaultValue !== this.latchedValue;
		}

		if (this._modified) {
			this._modified = false;
			return true;
		}

		return false;
	};

	Cvar.prototype.getDefaultValue = function () {
		return this._defaultValue;
	};

	Cvar.prototype.getAsInt = function () {
		var val = this._getValue();
		val = parseInt(val, 10);
		if (isNaN(val)) {
			return this._defaultValue;
		}
		return val;
	};

	Cvar.prototype.getAsFloat = function () {
		var val = this._getValue();
		val = parseFloat(val);
		if (isNaN(val)) {
			return this._defaultValue;
		}
		return val;
	};

	Cvar.prototype.getAsString = function () {
		var val = this._getValue();
		return val;
	};

	Cvar.prototype.getFlags = function () {
		return this._flags;
	}

	Cvar.prototype.set = function (val) {
		var oldValue = this._getValue();

		this._currentValue = val;

		modifiedFlags |= this._flags;
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
