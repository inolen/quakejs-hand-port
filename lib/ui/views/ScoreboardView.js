var ScoreboardModel = Backbone.Model.extend({
	defaults: function () {
		return {
			gametype: null,
			scores: null
		};
	}
});

var ScoreboardView = UIView.extend({
	template: _.template('{{ include ../templates/ScoreboardView.tpl }}'),
	model: {
		gametype: null,
		scores: null
	},
	initialize: function () {
		var self = this;

		this.model = new ScoreboardModel();

		// Bind change handlers.
		this.model.on('change:scores', this.update, this);
	},
	setGametype: function (gametype) {
		this.model.set('gametype', gametype);
	},
	setScores: function (scores) {
		this.model.set('scores', scores);
	},
	update: function () {
		this.render();
	},
	renderView: function () {
		var foobar = this.model.toJSON();
		this.el.innerHTML = this.template(foobar);

		return this;
	}
});
