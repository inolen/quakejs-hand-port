var IngameMenu = UIView.extend({
	model: {},
	template: _.template('{{ include ../templates/IngameMenu.tpl }}'),
	events: {
		'qk_click .settings':  'openSettingsMenu',
		'qk_click .exit-game': 'exitGame',
		'qk_click .close':     'closeMenu'
	},
	initialize: function () {
		this.render();
	},
	openSettingsMenu: function () {
		PushMenu('settings');
	},
	exitGame: function () {
		cl.Disconnect();
	},
	closeMenu: function () {
		PopAllMenus();
	},
	renderView: function () {
		this.$el.html(this.template(this.model));
		
		return this;
	}
});