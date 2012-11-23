define('ui/views/IngameMenu',
[
	'underscore',
	'jquery',
	'backbone',
	'text!ui/templates/IngameMenu.tpl' 
],
function (_, $, Backbone, templateSrc) {
	var imp;

	var IngameMenu = Backbone.View.extend({
		id: 'ingame',
		model: {},
		template: _.template(templateSrc),
		events: {
			'qk_click .settings':  'openSettingsMenu',
			'qk_click .exit-game': 'exitGame',
			'qk_click .close':     'closeMenu'
		},
		initialize: function (opts) {
			imp = opts;
			this.render();
		},
		openSettingsMenu: function () {
			imp.ui_PushMenu('settings');
		},
		exitGame: function () {
			imp.cl_Disconnect();
		},
		closeMenu: function () {
			imp.ui_PopAllMenus();
		},
		render: function () {
			$(this.el).html(this.template(this.model));
			return this;
		}
	});

	return IngameMenu;
});