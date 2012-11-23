define('ui/views/ScoreboardView',
[
	'underscore',
	'jquery',
	'backbone',
	'text!ui/templates/ScoreboardView.tpl'
],
function (_, $, Backbone, templateSrc) {
	var ui;
	
	var ScoreboardView = Backbone.View.extend({
		id: 'scoreboard',
		template: _.template(templateSrc),
		initialize: function (opts) {
			ui = opts.ui;
			this.render();
		},
		update: function (newModel) {
			var modelJson = JSON.stringify(this.model);

			if (modelJson !== this.oldModelJson) {
				$(this.el).html(this.template(this.model));
			}

			this.oldModelJson = modelJson;

			return this;
		},
		render: function () {
			$(this.el).html(this.template(this.model));
			return this;
		}
	});

	return ScoreboardView;
});