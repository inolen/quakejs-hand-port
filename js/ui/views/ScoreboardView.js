define('ui/views/ScoreboardView',
[
	'underscore',
	'backbone',
	'text!ui/templates/scoreboard.tpl'
],
function (_, Backbone, templateSrc) {
	var ui;
	
	var ScoreboardView = Backbone.View.extend({
		id: 'scoreboard',
		template: _.template(templateSrc),
		initialize: function (opts) {
			ui = opts.ui;
		},
		render: function () {
			var modelJson = JSON.stringify(this.model);

			if (modelJson !== this.oldModelJson) {
				$(this.el).html(this.template(this.model));
			}

			this.oldModelJson = modelJson;

			return this;
		}
	});

	return ScoreboardView;
});