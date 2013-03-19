define(function (require) {

var ko = require('vendor/knockout');
var QS = require('common/qshared');

var LAG_SAMPLES = 64;
var MAX_HUD_EVENTS = 6;
var HUD_EVENT_TIME     = 4000;
var CROSSHAIRNAME_TIME = 1000;
var CENTERPRINT_TIME   = 3000;

function HudEvent(type, text) {
	this.type = name;
	this.text = text;
}

function HudWeapon(icon, ammo) {
	this.icon = ko.observable(icon);
	this.ammo = ko.observable(ammo);
}

function HudSampleFrame(val, flags) {
	this.val = ko.observable(val);
	this.flags = ko.observable(flags);
}

function HudScore() {
	this.visible = ko.observable(false);
	this.localplayer = ko.observable(false);
	this.count = ko.observable(0);
	this.score = ko.observable(0);
	this.rank = ko.observable(0);
	this.name = ko.observable('');
}

function HudModel() {
	var self = this;

	self.alive = ko.observable(false);
	self.spectating = ko.observable(false);
	self.spectatorMessage = ko.observable('unknown');

	// Scores.
	self.score1 = new HudScore();
	self.score2 = new HudScore();

	// Chat.
	self.events = ko.observableArray([]);

	// Gamestate.
	self.gametype = new ko.observable('unknown');
	self.gamestate = new ko.observable(0);
	self.warmup = new ko.observable('unknown');

	// Player info.
	self.centerPrint = ko.observable(null);
	self.centerPrintVisible = ko.observable(false);
	self.centerPrintTimeout = 0;
	self.awardCount = ko.observable(0);
	self.awardImage = ko.observable(0);

	self.crosshairName = ko.observable(null);
	self.crosshairNameVisible = ko.observable(false);
	self.crosshairNameTimeout = 0;

	self.weaponSelect = ko.observable(0);
	self.weapons = ko.observableArray([]);
	self.fps = ko.observable(0);
	self.health = ko.observable(0);
	self.armor = ko.observable(0);

	// Lagometer.
	self.lagometerVisible = ko.observable(false);
	self.frames = ko.observableArray([]);
	self.currentFrame = 0;
	self.snapshots = ko.observableArray([]);
	self.currentSnapshot = 0;

	// Debug counts.
	self.countsVisible = ko.observable(false);
	self.shaders = ko.observable(0);
	self.nodes = ko.observable(0);
	self.leafs = ko.observable(0);
	self.surfaces = ko.observable(0);
	self.indexes = ko.observable(0);
	self.culledModelOut = ko.observable(0);
	self.culledModelIn = ko.observable(0);
	self.culledModelClip = ko.observable(0);

	self.addEvent = function (type, text) {
		// Shift one off the stack if we're full.
		if (self.events.length >= MAX_HUD_EVENTS) {
			self.events.shift();
		}

		// Add event to stack.
		var ev = new HudEvent(type, text);
		self.events.push(ev);

		// Remove in a few seconds if it still exists.
		setTimeout(function () {
			var idx = self.events.indexOf(ev);
			if (idx === -1) {
				return;
			}

			self.events.splice(idx, 1);
		}, HUD_EVENT_TIME);
	};

	self.setWeaponIcon = function (i, icon) {
		if (!self.weapons()[i]) {
			self.weapons.valueWillMutate();
			self.weapons()[i] = new HudWeapon(icon, 0);
			self.weapons.valueHasMutated();
		} else {
			self.weapons()[i].icon(icon);
		}
	};

	self.setWeaponAmmo = function (i, ammo) {
		if (!self.weapons()[i]) {
			self.weapons.valueWillMutate();
			self.weapons()[i] = new HudWeapon(0, ammo);
			self.weapons.valueHasMutated();
		} else {
			self.weapons()[i].ammo(ammo);
		}
	};

	self.addLagometerFrame = function (val) {
		var i = self.currentFrame++ % LAG_SAMPLES;

		if (!self.frames()[i]) {
			self.frames.valueWillMutate();
			self.frames()[i] = new HudSampleFrame(val, 0);
			self.frames.valueHasMutated();
		} else {
			self.frames()[i].val(val);
		}
	};

	self.addSnapshotFrame = function (val, flags) {
		var i = self.currentSnapshot++ % LAG_SAMPLES;

		if (!self.snapshots()[i]) {
			self.snapshots.valueWillMutate();
			self.snapshots()[i] = new HudSampleFrame(val, flags);
			self.snapshots.valueHasMutated();
		} else {
			self.snapshots()[i].val(val);
			self.snapshots()[i].flags(flags);
		}
	};

	self.setCrosshairName = function (name) {
		self.crosshairName(name);
		self.crosshairNameVisible(true);

		clearTimeout(self.crosshairNameTimeout);
		self.crosshairNameTimeout = setTimeout(function () {
			self.crosshairNameVisible(false);
		}, CROSSHAIRNAME_TIME);
	};

	self.setCenterPrint = function (text) {
		self.centerPrint(text);
		self.centerPrintVisible(true);

		clearTimeout(self.centerPrintTimeout);
		self.centerPrintTimeout = setTimeout(function () {
			self.centerPrintVisible(false);
		}, CENTERPRINT_TIME);
	};

	self.isTeamGame = ko.computed(function () {
		return self.gametype() === 'team' || self.gametype() === 'ctf' || self.gametype() === 'nfctf' ||
			self.gametype() === 'clanarena' || self.gametype() === 'rocketarena' || self.gametype() === 'practicearena';
	});
}

return HudModel;

});