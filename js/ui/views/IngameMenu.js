define('ui/views/IngameMenu',
[
	'underscore',
	'jquery',
	'backbone',
	'text!ui/templates/ingame.tpl' 
],
function (_, $, Backbone, templateSrc) {
	var ui;

	var IngameMenu = Backbone.View.extend({
		id: 'ingame',
		className: 'menu',
		model: {},
		template: _.template(templateSrc),
		events: {
			'click .singleplayer': 'openSinglePlayerMenu',
			'click .multiplayer': 'openMultiPlayerMenu',
			'click .settings': 'openSettingsMenu',
			'click .close': 'closeMenu'
		},
		initialize: function (opts) {
			ui = opts.ui;
			this.render();
		},
		openSinglePlayerMenu: function() {
			ui.SetActiveMenu('singleplayer');
		},
		openMultiPlayerMenu: function() {
			ui.SetActiveMenu('multiplayer');
		},
		openSettingsMenu: function() {
			ui.SetActiveMenu('settings');
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

	return IngameMenu;
});