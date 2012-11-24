define('ui/views/MainMenu',
[
	'underscore',
	'jquery',
	'backbone',
	'text!ui/templates/MainMenu.tpl' 
],
function (_, $, Backbone, templateSrc) {
	var imp;

	var IngameMenu = Backbone.View.extend({
		id: 'main',
		model: {},
		template: _.template(templateSrc),
		events: {
			'qk_click .singleplayer': 'openSinglePlayerMenu',
			'qk_click .multiplayer': 'openMultiPlayerMenu',
			'qk_click .settings': 'openSettingsMenu'
		},
		initialize: function (opts) {
			imp = opts;
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