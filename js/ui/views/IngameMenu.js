define('ui/views/IngameMenu',
[
	'underscore',
	'backbone',
	'text!ui/templates/ingame.tpl'
],
function (_, Backbone, templateSrc) {
	var IngameMenu = Backbone.View.extend({
		id: 'ingame-menu',
		model: {
			name: ''
		},
		template: _.template(templateSrc),
		dirty: true,
		events: {
			'click .single-player': 'openSinglePlayerMenu',
			'click .close': 'closeMenu',
			'click .name': 'editName'
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
		editName: function (ev) {
			var self = this;
			var el = ev.target;

			console.log('capturing input', this.model);

			ui.CaptureInput(function (keyName) {
				self.model.name += keyName;
				$('.name .control-input', self.el).text(self.model.name);
			}, null);
		},
		render: function () {
			if (this.dirty) {
				$(this.el).html(this.template(this.model));
				this.dirty = false;
			}

			return this;
		}
	});

	return IngameMenu;
});