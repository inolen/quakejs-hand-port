define(function (require) {

var ko = require('knockout');

return function (UI) {

function ArenaModel() {
	var self = this;

	self.name = ko.observable('unknown');
	self.playersPerTeam = ko.observable(0);
	self.numConnectedClients = ko.observable(0);
	self.teams = ko.observableArray([]);

	self.getTeam = function (i) {
		if (!self.teams()[i]) {
			self.teams.valueWillMutate();
			self.teams()[i] = new TeamModel();
			self.teams.valueHasMutated();
		}

		return self.teams()[i];
	};

	self.type = ko.computed(function () {
		return self.playersPerTeam() === 0 ? 'Pickup' : self.playersPerTeam() + 'v' + self.playersPerTeam();
	}, self);
}

function TeamModel() {
	this.name = ko.observable('unknown');
	this.score = ko.observable(0);
	this.count = ko.observable(0);
	this.alive = ko.observable(0);
}

function CurrentGameMenuModel() {
	var self = this;

	self.rocketarena = ko.observable(0);
	self.gametype = ko.observable('unknown');
	self.arenas = ko.observableArray([]);

	self.currentArenaNum = ko.observable(0);
	self.currentTeamNum = ko.observable(0);

	self.getArena = function (i) {
		if (!self.arenas()[i]) {
			self.arenas.valueWillMutate();
			self.arenas()[i] = new ArenaModel();
			self.arenas.valueHasMutated();
		}

		return self.arenas()[i];
	};

	self.lobby = ko.computed(function () {
		return self.rocketarena() && self.currentArenaNum() === 0;
	}, self);

	self.currentArena = ko.computed(function () {
		return self.getArena(self.currentArenaNum());
	});

	self.currentTeam = ko.computed(function () {
		return self.currentArena().getTeam(self.currentTeamNum());
	});

	self.redTeam = ko.computed(function () {
		return self.currentArena().getTeam(1);
	});

	self.blueTeam = ko.computed(function () {
		return self.currentArena().getTeam(2);
	});

	self.createTeam = function () {
		UI.ExecuteBuffer('team create foobar');
	};

	self.joinTeam = function (team) {
		UI.ExecuteBuffer('team ' + team);
		UI.PopMenu();
	};

	self.joinArena = function (arenaNum) {
		UI.ExecuteBuffer('arena ' + arenaNum);
		UI.PopMenu();
	};
}

return CurrentGameMenuModel;

};

});