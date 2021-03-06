define(function (require) {

var ko = require('vendor/knockout');

function ScoreModel(localPlayer, team, name, score, frags, deaths, time, ping, eliminated) {
	this.localPlayer = localPlayer;
	this.team = team;
	this.name = name;
	this.score = score;
	this.frags = frags;
	this.deaths = deaths;
	this.time = Math.floor(time);
	this.ping = ping;
	this.eliminated = eliminated;
}

function ScoreboardModel() {
	var self = this;

	function scoresForTeam(team) {
		var scores = [];

		for (var i = 0; i < self.scores().length; i++) {
			var score = self.scores()[i];

			if (score.team === team) {
				scores.push(score);
			}
		}

		return scores;
	}

	self.mapname = ko.observable('unknown');
	self.gametype = ko.observable('unknown');
	self.timelimit = ko.observable(0);
	self.fraglimit = ko.observable(0);
	self.capturelimit = ko.observable(0);
	self.score1 = ko.observable(0);
	self.score2 = ko.observable(0);
	self.scores = ko.observableArray([]);

	self.resetScores = function () {
		self.scores.removeAll();
	};

	self.addScore = function (localPlayer, team, name, score, frags, deaths, time, ping, eliminated) {
		self.scores.push(new ScoreModel(localPlayer, team, name, score, frags, deaths, time, ping, eliminated));
	};

	self.isTeamGame = ko.computed(function () {
		return self.gametype() === 'team' || self.gametype() === 'ctf' || self.gametype() === 'nfctf' ||
			self.gametype() === 'clanarena' || self.gametype() === 'rocketarena' || self.gametype() === 'practicearena';
	});

	self.freeScores = ko.computed(function () {
		return scoresForTeam(0);
	});

	self.redScores = ko.computed(function () {
		return scoresForTeam(1);
	});

	self.blueScores = ko.computed(function () {
		return scoresForTeam(2);
	});

	self.specScores = ko.computed(function () {
		return scoresForTeam(3);
	});
}

return ScoreboardModel;

});