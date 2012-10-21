define('ui/views/SettingsMenu',
[
	'underscore',
	'backbone',
	'text!ui/templates/settings.tpl' 
],
function (_, Backbone, templateSrc) {
	var ui;

	function ProcessKeyNameInput(str, keyName) {
		// A-Z a-z 0-9... this seems like a bad idea.
		if (keyName.length === 1) {
			str += keyName;
		} else if (keyName === 'space') {
			str += ' ';
		} else if (keyName === 'backspace') {
			str = str.slice(0, -1);
		}

		return str;
	}

	var SettingsMenu = Backbone.View.extend({
		id: 'settings',
		className: 'menu',
		model: {
			name: ''
		},
		template: _.template(templateSrc),
		events: {
			'keypress .name': 'editName',
			'blur .name': 'saveName',
			'click .close': 'closeMenu'
		},
		initialize: function (opts) {
			ui = opts.ui;
			this.render();
		},
		editName: function (ev, keyName) {
			this.model.name = ProcessKeyNameInput(this.model.name, keyName);
			this.$el.find('.name .control-input').text(this.model.name);
		},
		saveName: function () {
			console.log(this.model.name);
		},
		closeMenu: function () {
			ui.CloseActiveMenu();
		},
		render: function () {
			$(this.el).html(this.template(this.model));
			return this;
		}
	});

	return SettingsMenu;
});