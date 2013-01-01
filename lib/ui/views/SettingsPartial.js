var SettingsPartial = UIView.extend({
	template: _.template('{{ include ../templates/SettingsPartial.tpl }}'),
	model: {},
	cvars: {
		'name':        'name',
		'sensitivity': 'cl_sensitivity'
	},
	cmds: {
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
	},
	events: {
	},
	initialize: function () {
		var name, evt;

		// Add cvar / cmd input change events.
		for (name in this.cvars) {
			if (!this.cvars.hasOwnProperty(name)) {
				continue;
			}

			evt = 'qk_change [name="' + name + '"]';
			this.events[evt] = 'formChanged';
		}

		for (name in this.cmds) {
			if (!this.cmds.hasOwnProperty(name)) {
				continue;
			}

			evt = 'qk_change [name="' + name + '"]';
			this.events[evt] = 'formChanged';
		}

		this.loadConfigToModel();

		this.render();
	},
	formChanged: function (ev) {
		var settingName = $(ev.target).attr('name');
		var settingValue = ev.value;

		this.model[settingName] = settingValue;

		// Update all of our cvars / binds.
		var name;

		for (name in this.cvars) {
			if (!this.cvars.hasOwnProperty(name)) {
				continue;
			}

			var cvar = this.cvars[name];
			var val = this.model[name];

			com.SetCvarVal(cvar, val);
		}

		for (name in this.cmds) {
			if (!this.cmds.hasOwnProperty(name)) {
				continue;
			}

			// Bind any keys that have a value.
			var cmd = this.cmds[name];
			var key = this.model[name];

			if (key !== '') {
				cl.Bind(key, cmd);
			}
		}
	},
	loadConfigToModel: function () {
		var name;

		for (name in this.cvars) {
			if (!this.cvars.hasOwnProperty(name)) {
				continue;
			}

			var cvar = this.cvars[name];
			this.model[name] = com.GetCvarVal(cvar);
		}

		for (name in this.cmds) {
			if (!this.cmds.hasOwnProperty(name)) {
				continue;
			}

			var cmd = this.cmds[name];
			var keys = cl.GetKeyNamesForCmd(cmd);
			this.model[name] = keys.length ? keys[0] : '';
		}
	},
	renderView: function () {
		this.$el.html(this.template(this.model));

		return this;
	}
});