define('common/cvar', [], function () {
	/******************************************************
	 *
	 * Core CVAR class
	 *
	 ******************************************************/
	var FLAGS = {
		ROM:        1,                                     // display only, cannot be set by user at all
		ARCHIVE:    2,                                     // save to config file
		LATCH:      4,                                     // will only change when the value is added the
		                                                   // next time. dirty will be set, even though the
		                                                   // value hasn't changed yet.
		CHEAT:      8,                                     // save to config file
		USERINFO:   16,                                    // sent to server on connect or change
		SERVERINFO: 32,                                    // sent in response to front end requests
		SYSTEMINFO: 64                                     // these cvars will be duplicated on all clients
	};

	var Cvar = function (defaultValue, flags/*, callback*/) {
		this._defaultValue = typeof(defaultValue) === 'undefined' ? 0 : defaultValue;
		this._currentValue = this._defaultValue;
		this._latchedValue = this._defaultValue;
		this._flags = typeof(flags) === 'undefined' ? 0 : flags;
		// this._callback = callback;
	};

	Cvar.prototype._getValue = function () {
		if (this._flags & FLAGS.LATCH) {
			return this._latchedValue;
		} else {
			return this._currentValue;
		}
	};

	Cvar.prototype.dirty = function () {
		return this._defaultValue !== this.latchedValue;
	};

	Cvar.prototype.getDefaultValue = function () {
		return this._defaultValue;
	};

	Cvar.prototype.getAsInt = function () {
		var val = this._getValue();
		var ret = parseInt(val, 10);
		if (isNaN(ret)) {
			return this._defaultValue;
		}
		return ret;
	};

	Cvar.prototype.getAsFloat = function () {
		var val = this._getValue();
		var ret = parseFloat(val);
		if (isNaN(ret)) {
			return this._defaultValue;
		}
		return ret
	};

	Cvar.prototype.getAsString = function () {
		var val = this._getValue();
		return val;
	};

	Cvar.prototype.set = function (val) {
		var oldValue = this._getValue();

		this._currentValue = val;

		// // Trigger callback if specified.
		// if (cvar.callback) {
		// 	cvar.callback(val, oldValue);
		// }

		// TODO remove this and convert to some sort of default callback.
		cvarModifiedFlags |= this._flags;
	};

	/******************************************************
	 *
	 *
	 *
	 ******************************************************/
	var cvars = {};
	var cvarModifiedFlags = 0;

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

	function GetCvarsByFlag(flag) {
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

	function GetAllCvars() {
		return cvars;
	}

	var exports = {
		FLAGS:                   FLAGS,

		AddCvar:                 AddCvar,
		GetCvar:                 GetCvar,
		GetCvarsByFlag:          GetCvarsByFlag,
		GetAllCvars:             GetAllCvars
	};

	Object.defineProperty(exports, 'cvarModifiedFlags', {
		get: function () { return cvarModifiedFlags; },
		set: function (val) { cvarModifiedFlags = val; }
	});

	return exports;
});
