var LAG_SAMPLES = 64;
var MAX_HUD_EVENTS = 6;
var HUD_EVENT_TIME = 4000;

function HudEvent(type, text) {
	this.type = name;
	this.text = QS.colorize(text);
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
	this.localplayer = ko.observable(false);
	this.count = ko.observable(0);
	this.score = ko.observable(0);
	this.rank = ko.observable(0);
	this.name = ko.observable('');
}

function HudViewModel() {
	var self = this;

	self.visible = ko.observable(false);

	self.alive = ko.observable(false);

	// Gamestate display.
	self.gametype = new ko.observable('unknown');
	self.score1 = new HudScore();
	self.score2 = new HudScore();

	// Chat.
	self.events = ko.observableArray([]);

	// Player info.
	self.crosshairName = ko.observable('');
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
	self.shaders = ko.observable(0);
	self.nodes = ko.observable(0);
	self.leafs = ko.observable(0);
	self.surfaces = ko.observable(0);
	self.indexes = ko.observable(0);
	self.culledModelOut = ko.observable(0);
	self.culledModelIn = ko.observable(0);
	self.culledModelClip = ko.observable(0);

	// if (name !== null) {
	// 	this.els.crosshairName.innerHTML = name;
	// 	$(this.els.crosshairName).
	// 		removeClass('hidden').
	// 		addClass('visible').
	// 		trigger('recenter');
	// } else {
	// 	// We use CSS to fade out and delay immediately hiding the crosshair.
	// 	$(this.els.crosshairName).
	// 		removeClass('visible').
	// 		addClass('hidden');
	// }

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
}

HudViewModel.template = '{{ include ../templates/hud-view.tpl }}';