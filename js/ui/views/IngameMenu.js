define('ui/views/IngameMenu',
[
	'underscore',
	'backbone',
	'text!ui/templates/ingame.tpl'
],
function (_, Backbone, templateSrc) {
	var IngameMenu = Backbone.View.extend({
		id: 'ingame-menu',
		template: _.template(templateSrc),
		rendered: false,
		events: {
			'click .single-player': 'openSinglePlayerMenu',
			'click .close': 'closeMenu'
		},
		initialize: function (opts) {
			ui = opts.ui;
		},
		openSinglePlayerMenu: function() {
			alert('openSinglePlayerMenu');
		},
		closeMenu: function () {
			ui.CloseActiveMenu();
		},
		render: function () {
			if (!this.rendered) {
				$(this.el).html(this.template());
				this.rendered = true;
			}

			return this;
		}
	});

	return IngameMenu;
});