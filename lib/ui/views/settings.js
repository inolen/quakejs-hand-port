/* global CustomEvent:true */

define(function (require) {

var ko = require('vendor/knockout');
var Cvar = require('common/cvar');

function SettingsModel(opts) {
	var self = this;

	var cvars = {
		'sensitivity': 'sensitivity',
		'filter':      'm_filter',
		'name':        'name',
		'autoSwitch':  'cg_autoSwitch',
		'timeNudge':   'cl_timeNudge',
		'volume':      's_volume'
	};

	var cmds = {
		'forwardKey':  '+forward',
		'leftKey':     '+left',
		'backKey':     '+back',
		'rightKey':    '+right',
		'upKey':       '+jump',
		'attackKey':   '+attack',
		'zoomKey':     '+zoom',
		'weapnextKey': 'weapnext',
		'weapprevKey': 'weapprev',
		'weapon1Key':  'weapon 1',
		'weapon2Key':  'weapon 2',
		'weapon3Key':  'weapon 3',
		'weapon4Key':  'weapon 4',
		'weapon5Key':  'weapon 5',
		'weapon6Key':  'weapon 6',
		'weapon7Key':  'weapon 7',
		'weapon8Key':  'weapon 8',
		'weapon9Key':  'weapon 9',
		'chatKey':     'message'
	};

	// Add properties for cvars / cmds.
	for (var name in cvars) {
		if (!cvars.hasOwnProperty(name)) {
			continue;
		}

		var cvarName = cvars[name];
		var cvar = Cvar.AddCvar(cvarName);
		self[name] = ko.observable(cvar.get());
	}

	for (var name in cmds) {
		if (!cmds.hasOwnProperty(name)) {
			continue;
		}

		var cmd = cmds[name];
		var keys = opts.GetKeyNamesForCmd(cmd);
		self[name] = ko.observable(keys.join(', '));
	}

	//
	self.updated = function (data, ev) {
		var el = ev.target;
		var settingName = ev.target.getAttribute('name');
		var settingValue = ev.target.value;

		// Update the cvar or bind.
		if (cvars[settingName]) {
			var cvarName = cvars[settingName];
			var cvar = Cvar.AddCvar(cvarName);

			cvar.set(settingValue);
		} else if (cmds[settingName]) {
			var cmdName = cmds[settingName];
			var keys = settingValue ? settingValue.split(/[\s,]+/) : null;

			if (!keys) {
				opts.ExecuteBuffer('unbindall ' + cmdName);
			} else {
				for (var i = 0; i < keys.length; i++) {
					opts.ExecuteBuffer('bind ' + keys[i] + ' \"' + cmdName + '\"');
				}
			}
		}
	};
}

return SettingsModel;

});