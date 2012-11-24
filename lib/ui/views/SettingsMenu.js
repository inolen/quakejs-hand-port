define('ui/views/SettingsMenu',
[
	'underscore',
	'jquery',
	'backbone',
	'text!ui/templates/SettingsMenu.tpl' 
],
function (_, $, Backbone, templateSrc) {
	var imp;

	var SettingsMenu = Backbone.View.extend({
		id: 'settings',
		template: _.template(templateSrc),
		model: new Backbone.Model(),
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
		initialize: function (opts) {
			imp = opts;

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

			this.model.set(name, value);

			// Update all of our cvars / binds.
			for (var name in this.cvars) {
				if (!this.cvars.hasOwnProperty(name)) {
					continue;
				}

				var cvar = this.cvars[name];
				var value = this.model.get(name);

				imp.com_SetCvarVal(cvar, value);
			}

			for (var name in this.cmds) {
				if (!this.cmds.hasOwnProperty(name)) {
					continue;
				}

				// Bind any keys that have a value.
				var cmd = this.cmds[name];
				var key = this.model.get(name);

				if (key !== '') {
					imp.cl_Bind(key, cmd);
				}
			}
		},
		loadConfigToModel: function () {
			var data = {};

			for (var name in this.cvars) {
				if (!this.cvars.hasOwnProperty(name)) {
					continue;
				}

				var cvar = this.cvars[name];
				data[name] = imp.com_GetCvarVal(cvar);
			}

			for (var name in this.cmds) {
				if (!this.cmds.hasOwnProperty(name)) {
					continue;
				}

				var cmd = this.cmds[name];
				var keys = imp.cl_GetKeyNamesForCmd(cmd);
				data[name] = keys.length ? keys[0] : '';
			}

			this.model.set(data);
		},
		goBack: function () {
			imp.ui_PopMenu();
		},
		render: function () {
			this.$el.html(this.template(this.model.toJSON()));
			this.$el.trigger('qk_render');
			
			return this;
		}
	});

	return SettingsMenu;
});