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

	return HudView;
});