define('ui/views/SettingsMenu',
[
	'underscore',
	'backbone',
	'text!ui/templates/settings.tpl' 
],
function (_, Backbone, templateSrc) {
	var com;
	var cl;
	var ui;

	var SettingsMenu = Backbone.View.extend({
		id: 'settings',
		className: 'menu',
		model: {
			name: '',
			forwardKey: 'w',
			leftKey: 'a',
			backKey: 's',
			rightKey: 'd',
			upKey: 'space'
		},
		template: _.template(templateSrc),
		events: {
			'keypress .name': 'editName',
			'keypress .forward-key': 'editForwardKey',
			'keypress .left-key': 'editLeftKey',
			'keypress .back-key': 'editBackKey',
			'keypress .right-key': 'editRightKey',
			'keypress .up-key': 'editUpKey',
			'blur .control-group': 'saveConfig',
			'click .close': 'closeMenu'
		},
		initialize: function (opts) {
			com = opts.com;
			cl = opts.cl;
			ui = opts.ui;
			this.render();
		},
		editName: function (ev, keyName) {
			this.model.name = ui.ProcessTextInput(this.model.name, keyName);
			this.$el.find('.name .control-input').text(this.model.name);
		},
		editForwardKey: function (ev, keyName) {
			this.model.forwardKey = ui.ProcessKeyBindInput(keyName);
			this.$el.find('.forward-key .control-input').text(this.model.forwardKey);
		},
		editLeftKey: function (ev, keyName) {
			this.model.leftKey = ui.ProcessKeyBindInput(keyName);
			this.$el.find('.left-key .control-input').text(this.model.leftKey);
		},
		editBackKey: function (ev, keyName) {
			this.model.backKey = ui.ProcessKeyBindInput(keyName);
			this.$el.find('.back-key .control-input').text(this.model.backKey);
		},
		editRightKey: function (ev, keyName) {
			this.model.rightKey = ui.ProcessKeyBindInput(keyName);
			this.$el.find('.right-key .control-input').text(this.model.rightKey);
		},
		editUpKey: function (ev, keyName) {
			this.model.upKey = ui.ProcessKeyBindInput(keyName);
			this.$el.find('.up-key .control-input').text(this.model.upKey);
		},
		saveConfig: function () {
			cl.Bind(this.model.forwardKey, '+forward');
			cl.Bind(this.model.leftKey, '+left');
			cl.Bind(this.model.backKey, '+back');
			cl.Bind(this.model.rightKey, '+right');
			cl.Bind(this.model.upKey, '+jump');
			com.SaveConfig(function () {
				com.LoadConfig();
			});
		},
		closeMenu: function () {
			ui.CloseActiveMenu();
		},
		update: function (newModel) {
		},
		render: function () {
			$(this.el).html(this.template(this.model));
			return this;
		}
	});

	return SettingsMenu;
});