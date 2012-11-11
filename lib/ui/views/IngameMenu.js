define('ui/views/IngameMenu',
[
	'underscore',
	'jquery',
	'backbone',
	'text!ui/templates/ingame.tpl' 
],
function (_, $, Backbone, templateSrc) {
	var ui;
	var cl;

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
			ui = opts.ui;
			cl = opts.cl;
			
			this.render();
		},
		openSettingsMenu: function () {
			ui.PushMenu('settings');
		},
		exitGame: function () {
			cl.Disconnect();
		},
		closeMenu: function () {
			ui.PopAllMenus();
		},
		render: function () {
			$(this.el).html(this.template(this.model));
			return this;
		}
	});

	return IngameMenu;
});