define('common/cvar', [], function () {
	var FLAGS = {
		ARCHIVE:    1,                                         // save to config file
		CHEAT:      2,                                         // save to config file
		USERINFO:   4,                                         // sent to server on connect or change
		SERVERINFO: 8,                                         // sent in response to front end requests
		SYSTEMINFO: 16,                                        // these cvars will be duplicated on all clients
		LATCH:      32                                         // will only change when C code next does
		                                                       // a Cvar_Get(), so it can't be changed
		                                                       // without proper initialization. modified
		                                                       // will be set, even though the value hasn't
		                                                       // changed yet.
	};

	var Cvar = function (defaultValue, flags, callback) {
		this._defaultValue = typeof(defaultValue) === 'undefined' ? 0 : defaultValue;
		this._flags = typeof(flags) === 'undefined' ? 0 : flags;

				var oldValue = cvar.currentValue;

				// If newValue looks like a number, convert it.
				// This is quite the hack, see:
				// http://stackoverflow.com/questions/175739/is-there-a-built-in-way-in-javascript-to-check-if-a-string-is-a-valid-number
				if (!isNaN(newValue)) {
					// At this point, newValue could be '12.345' or 12.345.
					// Using +newValue will automatically convert either into
					// their proper numerical type.
					cvar.currentValue = +newValue;
				} else {
					cvar.currentValue = newValue;
				}

				// Trigger callback if specified.
				if (cvar.callback) {
					cvar.callback();
				}

				// TODO remove this and convert to some sort of default callback.
				// cvarModifiedFlags |= cvar.flags;
			}
		};

		cvar.defaultValue = defaultValue;
		cvar.currentValue = defaultValue;
		cvar.latchedValue = defaultValue;
		cvar.flags = flags;
		// cvar.callback = callback;

		return cvar;
	};

	Cvar.prototype._getValue = function () {
		if (this._flags & FLAGS.LATCH) {
			return this._latchedValue;
		} else {
			return this._currentValue;
		}
	};

	Cvar.prototype.getInt = function (index) {

	};

	Cvar.prototype.getFloat = function (index) {

	};

	Cvar.prototype.getString = function (index) {

	};

	Cvar.prototype.set = function (index) {

	};
});
