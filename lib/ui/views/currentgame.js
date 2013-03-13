define(function (require) {

var ko = require('knockout');

function ArenaModel() {
	var self = this;

	self.gametype = ko.observable('unknown');
	self.name = ko.observable('unknown');
	self.playersPerTeam = ko.observable(0);
	self.count = ko.observable(0);
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

function CurrentGameModel() {
	var self = this;

	self.currentArenaNum = ko.observable(0);
	self.currentGroup = ko.observable(null);
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

	self.isTeamGame = ko.computed(function () {
		return self.gametype() === 'team' || self.gametype() === 'ctf' || self.gametype() === 'nfctf' ||
			self.gametype() === 'clanarena' || self.gametype() === 'rocketarena' || self.gametype() === 'practicearena';
	});

	self.joinTeam = function (team) {
		// Escape quotes.
		team = team.replace(/"/g, '\\"');

		opts.ExecuteBuffer('team \"' + team + '\"');
		self.remove();
	};

	self.createTeam = function () {
		opts.ExecuteBuffer('team <default>');
		self.remove();
	};

	self.leaveTeam = function () {
		opts.ExecuteBuffer('team s');
		// Don't pop after leaving.
	};

	self.joinArena = function (arenaNum) {
		opts.ExecuteBuffer('arena ' + arenaNum);
		self.remove();
	};
}

return CurrentGameModel;

});