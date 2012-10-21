define('ui/views/IngameMenu',
[
	'underscore',
	'backbone',
	'text!ui/templates/ingame.tpl' 
],
function (_, Backbone, templateSrc) {
	var ui;

	var IngameMenu = Backbone.View.extend({
		id: 'ingame',
		className: 'menu',
		model: {},
		template: _.template(templateSrc),
		events: {
			'click .singleplayer': 'openSinglePlayerMenu',
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
		openSettingsMenu: function() {
			ui.SetActiveMenu('settings');
		},
		closeMenu: function () {
			ui.CloseActiveMenu();
		},
		render: function () {
			$(this.el).html(this.template(this.model));
			return this;
		}
	});

	return IngameMenu;
});