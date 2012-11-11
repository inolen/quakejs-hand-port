define('ui/views/ConnectView',
[
	'underscore',
	'jquery',
	'backbone',
	'text!ui/templates/connect.tpl'
],
function (_, $, Backbone, templateSrc) {
	var ui;

	var HudView = Backbone.View.extend({
		id: 'connect',
		template: _.template(templateSrc),
		model: {
			loading: 'Loading...'
		},
		loadingEl: null,
		initialize: function (opts) {
			ui = opts.ui;
			this.render();
		},
		setLoading: function (str) {
			if (!this.loadingEl) this.loadingEl = this.$el.find('.loading');
			this.model.loading = str;
			this.loadingEl.text(this.model.loading);
		},
		render: function () {
			this.$el.html(this.template(this.model));
			return this;
		}
	});

	return HudView;
});
