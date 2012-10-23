define('ui/views/HudView',
[
	'underscore',
	'backbone',
	'text!ui/templates/hud.tpl'
],
function (_, Backbone, templateSrc) {
	var ui;

	var HudView = Backbone.View.extend({
		id: 'hud',
		template: _.template(templateSrc),
		model: {
			fps: 0
		},
		fpsel: null,
		initialize: function (opts) {
			ui = opts.ui;
			this.render();
		},
		update: function (newModel) {
			this.fpsel.text(newModel.fps);
			this.model = newModel;
		},
		render: function () {
			this.$el.html(this.template(this.model));

			this.fpsel = this.$el.find('.fps-value');

			return this;
		}
	});

	return HudView;
});