function SettingsMenuModel() {
	var self = this;

	var cvars = {
		'sensitivity': 'cl_sensitivity',
		'name':        'name',
		'autoSwitch':  'cg_autoSwitch',
		'timeNudge':   'cl_timeNudge'
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
		'weapon9Key':  'weapon 9'
	};

	// Add properties for cvars / cmds.
	for (var name in cvars) {
		if (!cvars.hasOwnProperty(name)) {
			continue;
		}

		var cvarName = cvars[name];
		var cvar = Cvar.AddCvar(cvarName);
		self[name] = ko.observable(cvar.getValue());
	}

	for (var name in cmds) {
		if (!cmds.hasOwnProperty(name)) {
			continue;
		}

		var cmd = cmds[name];
		var keys = CL.GetKeyNamesForCmd(cmd);
		self[name] = ko.observable(keys.length ? keys[0] : '');
	}

	//
	self.updated = function (data, ev) {
		var settingName = ev.target.getAttribute('name');
		var settingValue = ev.target.value;

		// Update the cvar or bind.
		if (cvars[settingName]) {
			var cvarName = cvars[settingName];
			var cvar = Cvar.AddCvar(cvarName);

			cvar.setValue(settingValue);
		} else if (cmds[settingName]) {
			var cmdName = cmds[settingName];
			var keyName = settingValue;

			CL.ExecuteBuffer('unbindall ' + cmdName);

			if (!settingValue) {
				CL.ExecuteBuffer('unbind ' + keyName);
			} else {
				CL.ExecuteBuffer('bind ' + keyName + ' \"' + cmdName + '\"');
			}
		}
	};
};

SettingsMenuModel.template = '{{ include ../templates/settings-menu.tpl }}';