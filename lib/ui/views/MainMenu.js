var MainMenu = UIView.extend({
	model: { connected: false },
	template: _.template('{{ include ../templates/MainMenu.tpl }}'),
	events: {
		'qk_click .currentgame':  'showCurrentGameMenu',
		'qk_click .singleplayer': 'showSinglePlayerMenu',
		'qk_click .multiplayer':  'showMultiPlayerMenu',
		'qk_click .settings':     'showSettingsMenu'
	},
	initialize: function () {
		this.render();
	},
	setConnected: function (connected) {
		this.model.connected = connected;
		this.render();
	},
	showTab: function (name) {
		var constructor;

		if (name === 'currentgame') {
			constructor = CurrentGamePartial;
		} else if (name === 'singleplayer') {
			constructor = SinglePlayerPartial;
		} else if (name === 'multiplayer') {
			constructor = MultiPlayerPartial;
		} else if (name === 'settings') {
			constructor = SettingsPartial;
		}

		// Create menu.
		new constructor({
			el: $('.content', this.$el)
		});

		// Set active tab.
		$('.vertical-menu-item', this.$el).removeClass('active').
			filter('.' + name).addClass('active');
	},
	showCurrentGameMenu: function () {
		this.showTab('currentgame');
	},
	showSinglePlayerMenu: function () {
		this.showTab('singleplayer');
	},
	showMultiPlayerMenu: function () {
		this.showTab('multiplayer');
	},
	showSettingsMenu: function () {
		this.showTab('settings');
	},
	renderView: function () {
		this.$el.html(this.template(this.model));
		return this;
	}
});