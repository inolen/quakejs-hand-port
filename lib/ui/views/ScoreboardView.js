var ScoreboardModel = Backbone.Model.extend({
	defaults: function () {
		return {
			gametype: null,
			score1: null,
			score2: null,
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
		this.model.on('change:gametype', this.update, this);
		this.model.on('change:score1', this.update, this);
		this.model.on('change:score2', this.update, this);
		this.model.on('change:scores', this.update, this);
	},
	setGametype: function (gametype) {
		this.model.set('gametype', gametype);
	},
	setScore1: function (score1) {
		this.model.set('score1', score1);
	},
	setScore2: function (score2) {
		this.model.set('score2', score2);
	},
	setScores: function (scores) {
		var grouped = {
			'free': [],
			'red': [],
			'blue': [],
			'spectator': []
		};

		for (var i = 0; i < scores.length; i++) {
			var score = scores[i];

			if (score.team === 0) {
				grouped['free'].push(score);
			} else if (score.team === 1) {
				grouped['red'].push(score);
			} else if (score.team === 2) {
				grouped['blue'].push(score);
			} else if (score.team === 3) {
				grouped['spectator'].push(score);
			}
		}

		this.model.set('scores', grouped);
	},
	update: function () {
		if (this.model.get('gametype') === null ||
			this.model.get('score1') === null ||
			this.model.get('score2') === null ||
			this.model.get('scores') === null) {
			return;
		}

		this.render();
	},
	renderView: function () {
		var foobar = this.model.toJSON();
		this.el.innerHTML = this.template(foobar);

		return this;
	}
});
