define(function (require) {

var ko = require('knockout');

return function (UI) {

function ArenaModel() {
	var self = this;

	self.name = ko.observable('unknown');
	self.playersPerTeam = ko.observable(0);
	self.numClients = ko.observable(0);
	self.count1 = ko.observable(0);
	self.count2 = ko.observable(0);

	self.type = ko.computed(function () {
		return self.playersPerTeam() === 0 ? 'Pickup' : self.playersPerTeam() + 'v' + self.playersPerTeam();
	}, self);
}

function CurrentGameMenuModel() {
	var self = this;

	self.gametype = ko.observable('unknown');
	self.currentTeam = ko.observable(0);
	self.currentArenaNum = ko.observable(0);
	self.arenas = ko.observableArray([]);

	self.getArena = function (i) {
		if (!self.arenas()[i]) {
			self.arenas.valueWillMutate();
			self.arenas()[i] = new ArenaModel();
			self.arenas.valueHasMutated();
		}

		return self.arenas()[i];
	};

	self.rocketarena = ko.computed(function () {
		return self.gametype() === 'ca' && self.arenas().length > 1;
	}, self);

	self.lobby = ko.computed(function () {
		return self.rocketarena() && self.currentArenaNum() === 0;
	}, self);

	self.currentTeamName = ko.computed(function () {
		return self.currentTeam() === 1 ? 'RED' : 'BLUE';
	}, self);

	self.currentArena = ko.computed(function () {
		return self.getArena(self.currentArenaNum());
	});

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