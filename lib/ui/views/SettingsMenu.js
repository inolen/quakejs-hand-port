define('ui/views/SettingsMenu',
[
	'underscore',
	'jquery',
	'backbone',
	'text!ui/templates/settings.tpl' 
],
function (_, $, Backbone, templateSrc) {
	var com;
	var cl;
	var ui;

	var SettingsMenu = Backbone.View.extend({
		id: 'settings',
		template: _.template(templateSrc),
		model: {},
		modelCvars: [
			'name'
		],
		modelKeys: {
			'+forward': 'forwardKey',
			'+left':    'leftKey',
			'+back':    'backKey',
			'+right':   'rightKey',
			'+jump':    'upKey',
			'weapprev': 'weapprevKey',
			'weapnext': 'weapnextKey'
		},
		events: {
			'keypress .name':         'updateName',
			'keypress .forward-key':  'updateForwardKey',
			'keypress .left-key':     'updateLeftKey',
			'keypress .back-key':     'updateBackKey',
			'keypress .right-key':    'updateRightKey',
			'keypress .up-key':       'updateUpKey',
			'keypress .right-key':    'updateRightKey',
			'keypress .weapprev-key': 'updateWeapprevKey',
			'keypress .weapnext-key': 'updateWeapnextKey',
			'blur .control-input':    'saveConfig',
			'click .back' :           'goBack'
		},
		nameEl: null,
		forwardKeyEl: null,
		leftKeyEl: null,
		backKeyEl: null,
		rightKeyEl: null,
		upKeyEl: null,
		weapprevKeyEl: null,
		weapnextKeyEl: null,
		initialize: function (opts) {
			com = opts.com;
			cl = opts.cl;
			ui = opts.ui;

			for (var i = 0; i < this.modelCvars.length; i++) {
				var cvar = this.modelCvars[i];
				this.model[cvar] = com.GetCvarVal(cvar);
			}

			for (var key in this.modelKeys) {
				if (!this.modelKeys.hasOwnProperty(key)) {
					continue;
				}
				var mval = this.modelKeys[key];
				var keys = cl.GetKeyNamesForCmd(key);
				this.model[mval] = keys.length ? keys[0] : '';
			}

			this.render();
		},
		updateName: function (ev, keyName) {
			this.model.name = ui.ProcessTextInput(this.model.name, keyName);
			this.nameEl.text(this.model.name);
		},
		updateForwardKey: function (ev, keyName) {
			this.model.forwardKey = ui.ProcessKeyBindInput(keyName);
			this.forwardKeyEl.text(this.model.forwardKey);
		},
		updateLeftKey: function (ev, keyName) {
			this.model.leftKey = ui.ProcessKeyBindInput(keyName);
			this.leftKeyEl.text(this.model.leftKey);
		},
		updateBackKey: function (ev, keyName) {
			this.model.backKey = ui.ProcessKeyBindInput(keyName);
			this.backKeyEl.text(this.model.backKey);
		},
		updateRightKey: function (ev, keyName) {
			this.model.rightKey = ui.ProcessKeyBindInput(keyName);
			this.rightKeyEl.text(this.model.rightKey);
		},
		updateUpKey: function (ev, keyName) {
			this.model.upKey = ui.ProcessKeyBindInput(keyName);
			this.upKeyEl.text(this.model.upKey);
		},
		updateWeapprevKey: function (ev, keyName) {
			this.model.weapprevKey = ui.ProcessKeyBindInput(keyName);
			console.log('UPDATE WEAP PREV KEY', keyName, this.model.weapprevKey);
			this.weapprevKeyEl.text(this.model.weapprevKey);
		},
		updateWeapnextKey: function (ev, keyName) {
			this.model.weapnextKey = ui.ProcessKeyBindInput(keyName);
			console.log('UPDATE WEAP NEXT KEY', keyName, this.model.weapnextKey);
			console.log('binding', this.model.weapnextKey);
			this.weapnextKeyEl.text(this.model.weapnextKey);
		},
		saveConfig: function () {
			for (var i = 0; i < this.modelCvars.length; i++) {
				var cvar = this.modelCvars[i];
				com.SetCvarVal(cvar, this.model[cvar]);
			}

			cl.UnbindAll();
			for (var key in this.modelKeys) {
				if (!this.modelKeys.hasOwnProperty(key)) {
					continue;
				}
				var mval = this.modelKeys[key];
				if (mval !== '') {
					console.log('SaveConfig', key, mval, this.model[mval]);
					cl.Bind(this.model[mval], key);
				}
			}

			com.SaveConfig(function (err) {
				if (err) {
					throw new Error('Error saving configuration');
				}

				com.LoadConfig();
			});
		},
		goBack: function () {
			ui.PopMenu();
		},
		render: function () {
			this.$el.html(this.template(this.model));

			this.nameEl        = this.$el.find('.name .control-input');
			this.forwardKeyEl  = this.$el.find('.forward-key .control-input');
			this.leftKeyEl     = this.$el.find('.left-key .control-input');
			this.backKeyEl     = this.$el.find('.back-key .control-input');
			this.rightKeyEl    = this.$el.find('.right-key .control-input');
			this.upKeyEl       = this.$el.find('.up-key .control-input');
			this.weapprevKeyEl = this.$el.find('.weapprev-key .control-input');
			this.weapnextKeyEl = this.$el.find('.weapnext-key .control-input');

			return this;
		}
	});

	return SettingsMenu;
});