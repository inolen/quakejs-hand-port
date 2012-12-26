var MainMenu = UIView.extend({
	model: {},
	template: _.template('{{ include ../templates/MainMenu.tpl }}'),
	events: {
		'qk_click .singleplayer': 'openSinglePlayerMenu',
		'qk_click .multiplayer':  'openMultiPlayerMenu',
		'qk_click .settings':     'openSettingsMenu'
	},
	initialize: function () {
		this.render();
	},
	openSinglePlayerMenu: function() {
		var menu = new SinglePlayerPartial({
			el: $('.content', this.$el)
		});
	},
	openMultiPlayerMenu: function() {
		var menu = new MultiPlayerPartial({
			el: $('.content', this.$el)
		});
	},
	openSettingsMenu: function() {
		var menu = new SettingsPartial({
			el: $('.content', this.$el)
		});
	},
	renderView: function () {
		this.$el.html(this.template(this.model));
		return this;
	}
});