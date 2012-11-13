define('ui/views/SettingsMenu',
[
	'underscore',
	'jquery',
	'backbone',
	'text!ui/templates/settings.tpl' 
],
function (_, $, Backbone, templateSrc) {
	var imp;

	var SettingsMenu = Backbone.View.extend({
		id: 'settings',
		template: _.template(templateSrc),
		model: {},
		modelCvars: [
			'name'
		],
		// TODO store all of this in a big data structure, there is way too much C&P in here.
		modelKeys: {
			'+forward': 'forwardKey',
			'+left':    'leftKey',
			'+back':    'backKey',
			'+right':   'rightKey',
			'+jump':    'upKey',
			'+attack':  'attackKey',
			'weapnext': 'weapnextKey',
			'weapprev': 'weapprevKey'
		},
		events: {
			'keypress .name':         'updateName',
			'keypress .forward-key':  'updateForwardKey',
			'keypress .left-key':     'updateLeftKey',
			'keypress .back-key':     'updateBackKey',
			'keypress .right-key':    'updateRightKey',
			'keypress .up-key':       'updateUpKey',
			'keypress .right-key':    'updateRightKey',
			'keypress .attack-key':   'updateAttackKey',
			'keypress .weapnext-key': 'updateWeapnextKey',
			'keypress .weapprev-key': 'updateWeapprevKey',
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
			imp = opts;

			for (var i = 0; i < this.modelCvars.length; i++) {
				var cvar = this.modelCvars[i];
				this.model[cvar] = imp.COM_GetCvarVal(cvar);
			}

			for (var key in this.modelKeys) {
				if (!this.modelKeys.hasOwnProperty(key)) {
					continue;
				}
				var mval = this.modelKeys[key];
				var keys = imp.CL_GetKeyNamesForCmd(key);
				this.model[mval] = keys.length ? keys[0] : '';
			}

			this.render();
		},
		updateName: function (ev, keyName) {
			this.model.name = imp.UI_ProcessTextInput(this.model.name, keyName);
			this.nameEl.text(this.model.name);
		},
		updateForwardKey: function (ev, keyName) {
			this.model.forwardKey = imp.UI_ProcessKeyBindInput(keyName);
			this.forwardKeyEl.text(this.model.forwardKey);
		},
		updateLeftKey: function (ev, keyName) {
			this.model.leftKey = imp.UI_ProcessKeyBindInput(keyName);
			this.leftKeyEl.text(this.model.leftKey);
		},
		updateBackKey: function (ev, keyName) {
			this.model.backKey = imp.UI_ProcessKeyBindInput(keyName);
			this.backKeyEl.text(this.model.backKey);
		},
		updateRightKey: function (ev, keyName) {
			this.model.rightKey = imp.UI_ProcessKeyBindInput(keyName);
			this.rightKeyEl.text(this.model.rightKey);
		},
		updateUpKey: function (ev, keyName) {
			this.model.upKey = imp.UI_ProcessKeyBindInput(keyName);
			this.upKeyEl.text(this.model.upKey);
		},
		updateAttackKey: function (ev, keyName) {
			this.model.attackKey = imp.UI_ProcessKeyBindInput(keyName);
			this.attackKeyEl.text(this.model.attackKey);
		},
		updateWeapnextKey: function (ev, keyName) {
			this.model.weapnextKey = imp.UI_ProcessKeyBindInput(keyName);
			this.weapnextKeyEl.text(this.model.weapnextKey);
		},
		updateWeapprevKey: function (ev, keyName) {
			this.model.weapprevKey = imp.UI_ProcessKeyBindInput(keyName);
			this.weapprevKeyEl.text(this.model.weapprevKey);
		},
		saveConfig: function () {
			for (var i = 0; i < this.modelCvars.length; i++) {
				var cvar = this.modelCvars[i];
				imp.COM_SetCvarVal(cvar, this.model[cvar]);
			}

			// Unbind all old keys before we save.
			imp.CL_UnbindAll();

			for (var key in this.modelKeys) {
				if (!this.modelKeys.hasOwnProperty(key)) {
					continue;
				}

				// Bind any new keys that have a value.
				var mval = this.modelKeys[key];
				if (mval !== '') {
					imp.CL_Bind(this.model[mval], key);
				}
			}

			imp.COM_SaveConfig(function (err) {
				if (err) {
					throw new Error('Error saving configuration');
				}

				imp.COM_LoadConfig();
			});
		},
		goBack: function () {
			imp.UI_PopMenu();
		},
		render: function () {
			this.$el.html(this.template(this.model));

			this.nameEl        = this.$el.find('.name .control-input');
			this.forwardKeyEl  = this.$el.find('.forward-key .control-input');
			this.leftKeyEl     = this.$el.find('.left-key .control-input');
			this.backKeyEl     = this.$el.find('.back-key .control-input');
			this.rightKeyEl    = this.$el.find('.right-key .control-input');
			this.upKeyEl       = this.$el.find('.up-key .control-input');
			this.attackKeyEl   = this.$el.find('.attack-key .control-input');
			this.weapnextKeyEl = this.$el.find('.weapnext-key .control-input');
			this.weapprevKeyEl = this.$el.find('.weapprev-key .control-input');

			return this;
		}
	});

	return SettingsMenu;
});