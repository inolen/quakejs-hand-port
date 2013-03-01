define(function (require) {

var ko = require('knockout');

return function (UI) {

function ArenaModel() {
	var self = this;

	self.gametype = ko.observable('unknown');
	self.name = ko.observable('unknown');
	self.playersPerTeam = ko.observable(0);
	self.numConnectedClients = ko.observable(0);
	self.score1 = ko.observable({
		count: 0
	});
	self.score2 = ko.observable({
		count: 0
	});
	self.groups = ko.observableArray([]);

	self.clearGroups = function () {
		self.groups.removeAll();
	};

	self.addGroup = function (name, count) {
		self.groups.push(new GroupModel(name, count));
	};

	self.type = ko.computed(function () {
		return self.playersPerTeam() === 0 ? 'Pickup' : self.playersPerTeam() + 'v' + self.playersPerTeam();
	});
}

function GroupModel(name, count) {
	var self = this;

	self.name = ko.observable(name);
	self.count = ko.observable(count);
}

function CurrentGameMenuModel() {
	var self = this;

	self.currentArenaNum = ko.observable(0);
	self.currentTeamNum = ko.observable(0);
	self.arenas = ko.observableArray([]);

	self.getArena = function (i) {
		if (!self.arenas()[i]) {
			self.arenas.valueWillMutate();
			self.arenas()[i] = new ArenaModel();
			self.arenas.valueHasMutated();
		}

		return self.arenas()[i];
	};

	self.currentArena = ko.computed(function () {
		return self.getArena(self.currentArenaNum());
	});

	self.gametype = ko.computed(function () {
		return self.currentArena().gametype();
	});

	self.createTeam = function () {
		UI.ExecuteBuffer('team <default>');
		UI.PopMenu();
	};

	self.joinTeam = function (team) {
		// Escape quotes.
		team = team.replace(/"/g, '\\"');

		UI.ExecuteBuffer('team \"' + team + '\"');
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