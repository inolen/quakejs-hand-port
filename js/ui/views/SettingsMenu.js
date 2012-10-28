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
		className: 'menu',
		template: _.template(templateSrc),
		model: {
			name: '',
			forwardKey: '',
			leftKey: '',
			backKey: '',
			rightKey: '',
			upKey: ''
		},
		nameEl: null,
		forwardKeyEl: null,
		leftKeyEl: null,
		backKeyEl: null,
		rightKeyEl: null,
		upKeyEl: null,
		events: {
			'keypress .name':        'updateName',
			'keypress .forward-key': 'updateForwardKey',
			'keypress .left-key':    'updateLeftKey',
			'keypress .back-key':    'updateBackKey',
			'keypress .right-key':   'updateRightKey',
			'keypress .up-key':      'updateUpKey',
			'blur .control-input':   'saveConfig',
			'click .close':          'closeMenu'
		},
		initialize: function (opts) {
			com = opts.com;
			cl = opts.cl;
			ui = opts.ui;

			this.model.name = com.GetCvarVal('name');

			var keys;

			if ((keys = cl.GetKeyNamesForCmd('+forward'))) {
				this.model.forwardKey = keys[0];
			}

			if ((keys = cl.GetKeyNamesForCmd('+left'))) {
				this.model.leftKey = keys[0];
			}

			if ((keys = cl.GetKeyNamesForCmd('+back'))) {
				this.model.backKey = keys[0];
			}

			if ((keys = cl.GetKeyNamesForCmd('+right'))) {
				this.model.rightKey = keys[0];
			}

			if ((keys = cl.GetKeyNamesForCmd('+jump'))) {
				this.model.upKey = keys[0];
			}

			this.render();
		},
		updateName: function (ev, keyName) {
			var str = ui.ProcessTextInput(this.nameEl.text(), keyName);
			this.nameEl.text(str);
		},
		updateForwardKey: function (ev, keyName) {
			var str = ui.ProcessKeyBindInput(keyName);
			this.forwardKeyEl.text(str);
		},
		updateLeftKey: function (ev, keyName) {
			var str = ui.ProcessKeyBindInput(keyName);
			this.leftKeyEl.text(str);
		},
		updateBackKey: function (ev, keyName) {
			var str = ui.ProcessKeyBindInput(keyName);
			this.backKeyEl.text(str);
		},
		updateRightKey: function (ev, keyName) {
			var str = ui.ProcessKeyBindInput(keyName);
			this.rightKeyEl.text(str);
		},
		updateUpKey: function (ev, keyName) {
			var str = ui.ProcessKeyBindInput(keyName);
			this.upKeyEl.text(str);
		},
		saveConfig: function () {
			this.model.name = this.nameEl.text();
			this.model.forwardKey = this.forwardKeyEl.text();
			this.model.leftKey = this.leftKeyEl.text();
			this.model.backKey = this.backKeyEl.text();
			this.model.rightKey = this.rightKeyEl.text();
			this.model.upKey = this.upKeyEl.text();

			com.SetCvarVal('name', this.model.name);
			cl.Bind(this.model.forwardKey, '+forward');
			cl.Bind(this.model.leftKey, '+left');
			cl.Bind(this.model.backKey, '+back');
			cl.Bind(this.model.rightKey, '+right');
			cl.Bind(this.model.upKey, '+jump');

			com.SaveConfig(function (err) {
				if (err) {
					throw new Error('Error saving configuration');
				}

				com.LoadConfig();
			});
		},
		closeMenu: function () {
			ui.CloseActiveMenu();
		},
		render: function () {
			this.$el.html(this.template(this.model));

			this.nameEl = this.$el.find('.name .control-input');
			this.forwardKeyEl = this.$el.find('.forward-key .control-input');
			this.leftKeyEl = this.$el.find('.left-key .control-input');
			this.backKeyEl = this.$el.find('.back-key .control-input');
			this.rightKeyEl = this.$el.find('.right-key .control-input');
			this.upKeyEl = this.$el.find('.up-key .control-input');

			return this;
		}
	});

	return SettingsMenu;
});