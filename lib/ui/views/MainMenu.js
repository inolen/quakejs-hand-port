var MainMenu = UIView.extend({
	model: {},
	template: _.template('{{ include ../templates/MainMenu.tpl -}}'),
	events: {
		'qk_click .singleplayer': 'openSinglePlayerMenu',
		'qk_click .multiplayer': 'openMultiPlayerMenu',
		'qk_click .settings': 'openSettingsMenu'
	},
	initialize: function () {
		this.render();
	},
	openSinglePlayerMenu: function() {
		PushMenu('singleplayer');
	},
	openMultiPlayerMenu: function() {
		PushMenu('multiplayer');
	},
	openSettingsMenu: function() {
		PushMenu('settings');
	},
	renderView: function () {
		this.$el.html(this.template(this.model));
		return this;
	}
});