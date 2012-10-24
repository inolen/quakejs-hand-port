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
		fpsEl: null,
		initialize: function (opts) {
			ui = opts.ui;
			this.render();
		},
		setFPS: function (fps) {
			if (!this.fpsEl) {
				this.fpsEl = this.$el.find('.fps-value');
			}
			this.model.fps = fps;
			this.fpsEl.text(this.model.fps);
		},
		render: function () {
			this.$el.html(this.template(this.model));
			return this;
		}
	});

	return HudView;
});