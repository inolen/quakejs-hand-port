var ScoreboardView = UIView.extend({
	template: _.template('{{ include ../templates/ScoreboardView.tpl }}'),
	model: {
		scores: null
	},
	initialize: function () {
	},
	setScores: function (scores) {
		this.model.scores = scores;
		this.render();
	},
	renderView: function () {
		this.$el.html(this.template(this.model));
		return this;
	}
});
