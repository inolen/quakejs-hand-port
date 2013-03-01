define(function (require) {

var ko = require('knockout');

return function (UI) {

function ScoreModel(name, score, ping, time, eliminated) {
	this.name = name;
	this.score = score;
	this.ping = ping;
	this.time = time;
	this.eliminated = eliminated;
}

function ScoreboardViewModel() {
	var self = this;

	self.visible = ko.observable(false);
	self.gametype = ko.observable('unknown');
	self.score1 = ko.observable(0);
	self.score2 = ko.observable(0);
	self.freeScores = ko.observableArray([]);
	self.redScores = ko.observableArray([]);
	self.blueScores = ko.observableArray([]);
	self.specScores = ko.observableArray([]);

	self.resetScores = function () {
		self.freeScores.removeAll();
		self.redScores.removeAll();
		self.blueScores.removeAll();
		self.specScores.removeAll();
	};

	self.addFreeScore = function (name, score, ping, time, eliminated) {
		self.freeScores.push(new ScoreModel(name, score, ping, time, eliminated));
	};

	self.addRedScore = function (name, score, ping, time, eliminated) {
		self.redScores.push(new ScoreModel(name, score, ping, time, eliminated));
	};

	self.addBlueScore = function (name, score, ping, time, eliminated) {
		self.blueScores.push(new ScoreModel(name, score, ping, time, eliminated));
	};

	self.addSpecScore = function (name, score, ping, time, eliminated) {
		self.specScores.push(new ScoreModel(name, score, ping, time, eliminated));
	};
}

return ScoreboardViewModel;

};

});