define('ui/views/MainMenu',
[
	'underscore',
	'jquery',
	'backbone',
	'text!ui/templates/main.tpl' 
],
function (_, $, Backbone, templateSrc) {
	var ui;

	var IngameMenu = Backbone.View.extend({
		id: 'main',
		model: {},
		template: _.template(templateSrc),
		events: {
			'click .singleplayer': 'openSinglePlayerMenu',
			'click .multiplayer': 'openMultiPlayerMenu',
			'click .settings': 'openSettingsMenu'
		},
		initialize: function (opts) {
			ui = opts.ui;
			this.render();
		},
		openSinglePlayerMenu: function() {
			imp.ui_PushMenu('singleplayer');
		},
		openMultiPlayerMenu: function() {
			imp.ui_PushMenu('multiplayer');
		},
		openSettingsMenu: function() {
			imp.ui_PushMenu('settings');
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