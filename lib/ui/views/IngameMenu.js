define('ui/views/IngameMenu',
[
	'underscore',
	'jquery',
	'backbone',
	'text!ui/templates/ingame.tpl' 
],
function (_, $, Backbone, templateSrc) {
	var exp;

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
			exp = opts;
			this.render();
		},
		openSettingsMenu: function () {
			exp.UI_PushMenu('settings');
		},
		exitGame: function () {
			exp.CL_Disconnect();
		},
		closeMenu: function () {
			exp.UI_PopAllMenus();
		},
		render: function () {
			$(this.el).html(this.template(this.model));
			return this;
		}
	});

	return IngameMenu;
});