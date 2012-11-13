define('ui/views/IngameMenu',
[
	'underscore',
	'jquery',
	'backbone',
	'text!ui/templates/ingame.tpl' 
],
function (_, $, Backbone, templateSrc) {
	var imp;

	var IngameMenu = Backbone.View.extend({
		id: 'ingame',
		model: {},
		template: _.template(templateSrc),
		events: {
			'click .settings':  'openSettingsMenu',
			'click .exit-game': 'exitGame',
			'click .close':     'closeMenu'
		},
		initialize: function (opts) {
			imp = opts;
			this.render();
		},
		openSettingsMenu: function () {
			imp.UI_PushMenu('settings');
		},
		exitGame: function () {
			imp.CL_Disconnect();
		},
		closeMenu: function () {
			imp.UI_PopAllMenus();
		},
		render: function () {
			$(this.el).html(this.template(this.model));
			return this;
		}
	});

	return IngameMenu;
});