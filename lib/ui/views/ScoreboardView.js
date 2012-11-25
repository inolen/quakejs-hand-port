var ScoreboardView = UIView.extend({
	template: _.template('{{ include ../templates/ScoreboardView.tpl -}}'),
	initialize: function () {
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
	renderView: function () {
		this.$el.html(this.template(this.model));

		return this;
	}
});