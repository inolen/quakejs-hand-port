define(function (require) {

var ko = require('knockout');

return function (UI) {

function ScoreModel() {
	this.name = ko.observable('unknown');
	this.rank = ko.observable(0);
	this.team = ko.observable(0);
	this.score = ko.observable(0);
	this.ping = ko.observable(0);
	this.time = ko.observable(0);
	this.eliminated = ko.observable(0);
	this.spectatorNum = ko.observable(0);
}

function ScoreboardViewModel() {
	var self = this;

	self.visible = ko.observable(false);
	self.gametype = ko.observable('unknown');
	self.score1 = ko.observable(0);
	self.score2 = ko.observable(0);
	self.scores = ko.observableArray([]);

	self.getScore = function (i) {
		if (!self.scores()[i]) {
			self.scores.valueWillMutate();
			self.scores()[i] = new ScoreModel();
			self.scores.valueHasMutated();
		}

		return self.scores()[i];
	};

// viewModel.sortFunction = function(a, b) {
//         return a.FirstName().toLowerCase() > b.FirstName().toLowerCase() ? 1 : -1;
// };

	var scoresForTeam = function (team) {
		var scores = [];

		for (var i = 0; i < self.scores.length; i++) {
			if (self.scores[i].team === team) {
				scores.push(self.scores[i]);
			}
		}

		return scores;
	};

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

// viewModel.sortedInstances = ko.dependentObservable(function() {
//     return this.instances.slice().sort(this.sortFunction);
// }, viewModel);
}

return ScoreboardViewModel;

};

});