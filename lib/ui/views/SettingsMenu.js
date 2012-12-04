var SettingsMenu = UIView.extend({
	template: _.template('{{ include ../templates/SettingsMenu.tpl }}'),
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
		'qk_click .back': 'goBack'
	},
	initialize: function () {
		// Add cvar / cmd input change events.
		for (var name in this.cvars) {
			if (!this.cvars.hasOwnProperty(name)) {
				continue;
			}

			var evt = 'qk_change [name="' + name + '"]';
			this.events[evt] = 'formChanged';
		}

		for (var name in this.cmds) {
			if (!this.cmds.hasOwnProperty(name)) {
				continue;
			}

			var evt = 'qk_change [name="' + name + '"]';
			this.events[evt] = 'formChanged';
		}

		this.loadConfigToModel();

		this.render();
	},
	formChanged: function (ev) {
		var name = $(ev.target).attr('name'),
			value = ev.value;

		this.model[name] = value;

		// Update all of our cvars / binds.
		for (var name in this.cvars) {
			if (!this.cvars.hasOwnProperty(name)) {
				continue;
			}

			var cvar = this.cvars[name];
			var value = this.model[name];

			com.SetCvarVal(cvar, value);
		}

		for (var name in this.cmds) {
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
		for (var name in this.cvars) {
			if (!this.cvars.hasOwnProperty(name)) {
				continue;
			}

			var cvar = this.cvars[name];
			this.model[name] = com.GetCvarVal(cvar);
		}

		for (var name in this.cmds) {
			if (!this.cmds.hasOwnProperty(name)) {
				continue;
			}

			var cmd = this.cmds[name];
			var keys = cl.GetKeyNamesForCmd(cmd);
			this.model[name] = keys.length ? keys[0] : '';
		}
	},
	goBack: function () {
		PopMenu();
	},
	renderView: function () {
		this.$el.html(this.template(this.model));
		
		return this;
	}
});