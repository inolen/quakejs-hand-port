var LAG_SAMPLES = 64;
var MAX_EVENTS = 6;
var EVENT_TIME = 4000;

var HudModel = Backbone.Model.extend({
	defaults: function () {
		return {
			crosshairName: null,
			gametype: null,
			score1: null,
			score2: null,
			events: [],
			currentEvent: 0,
			fps: 0,
			weapons: [],
			weaponSelect: 0,
			health: 'N/A',
			ammo: [],
			armor: 'N/A',
			lagometerVisible: false,
			frames: {
				samples: new Array(LAG_SAMPLES),
				count: 0
			},
			snapshots: {
				samples: new Array(LAG_SAMPLES),
				flags: new Array(LAG_SAMPLES),
				count: 0
			},
			shaders: 0,
			nodes: 0,
			leafs: 0,
			surfaces: 0,
			indexes: 0,
			culledModelOut: 0,
			culledModelIn: 0,
			culledModelClip: 0,
		};
	}
});

var HudView = UIView.extend({
	model: null,
	els: {},
	template: _.template('{{ include ../templates/HudView.tpl }}'),
	initialize: function () {
		var self = this;

		this.model = new HudModel();

		// Bind change handlers.
		this.model.on('change:crosshairName', this.updateCrosshairName, this);
		this.model.on('change:gametype', this.updateScores, this);
		this.model.on('change:score1', this.updateScores, this);
		this.model.on('change:score2', this.updateScores, this);
		this.model.on('change:events', this.updateEvents, this);
		this.model.on('change:fps', this.updateFPS, this);
		this.model.on('change:weapons', this.updateWeapons, this);
		this.model.on('change:weaponSelect', this.updateWeaponSelect, this);
		this.model.on('change:ammo', this.updateAmmo, this);
		this.model.on('change:armor', this.updateArmor, this);
		this.model.on('change:health', this.updateHealth, this);
		this.model.on('change:lagometerVisible', this.updateLagometer, this);
		this.model.on('change:lagometerFrame', this.updateLagometerFrame, this);
		this.model.on('change:snapshotFrame', this.updateSnapshotFrame, this);
		this.model.on(
			'change:shaders change:nodes change:leafs change:surfaces change:indexes ' +
			'change:culledModelOut change:culledModelIn change:culledModelClip', this.updateCounts, this);

		this.render();
	},
	/******************************************************
	 *
	 * Helper methods called directly by cgame
	 *
	 ******************************************************/
	setCrosshairName: function (name) {
		this.model.set({ 'crosshairName': name });
	},
	setGametype: function (gametype) {
		this.model.set({ 'gametype': gametype });
	},
	setScore1: function (score) {
		this.model.set({ 'score1': score });
	},
	setScore2: function (score) {
		this.model.set({ 'score2': score });
	},
	addEvent: function (ev) {
		var self = this;
		var events = this.model.get('events');

		// Shift one off the stack if we're full.
		if (events.length >= MAX_EVENTS) {
			events.shift();
		}

		// Add event to stack.
		events.push(ev);

		// Remove in a few seconds if it still exists.
		setTimeout(function () {
			var idx = events.indexOf(ev);
			if (idx === -1) {
				return;
			}
			events.splice(idx, 1);

			// Manually trigger update.
			self.model.trigger('change:events', this, events);
		}, EVENT_TIME);

		// Manually trigger update.
		this.model.trigger('change:events', this, events);
	},
	setFPS: function (fps) {
		this.model.set({ 'fps': fps });
	},
	setWeapon: function (i, weaponInfo, selected) {
		var currentWeapons = this.model.get('weapons');

		if (currentWeapons[i] !== weaponInfo) {
			currentWeapons[i] = weaponInfo;
			this.model.trigger('change:weapons', this, currentWeapons);
		}
	},
	setWeaponSelect: function (select) {
		this.model.set({ 'weaponSelect': select });
	},
	setAmmo: function (i, ammo) {
		var currentAmmo = this.model.get('ammo');

		if (currentAmmo[i] !== ammo) {
			currentAmmo[i] = ammo;
			this.model.trigger('change:ammo', this, i, ammo);
		}
	},
	setHealth: function (health) {
		this.model.set({ 'health': health });
	},
	setArmor: function (armor) {
		this.model.set({ 'armor': armor });
	},
	showLagometer: function () {
		this.model.set({ 'lagometerVisible': true });
	},
	hideLagometer: function () {
		this.model.set({ 'lagometerVisible': false });
	},
	addLagometerFrame: function (offset) {
		var frames = this.model.get('frames');

		var frame = frames.count % LAG_SAMPLES;
		frames.samples[frame] = offset;
		frames.count++;

		this.model.trigger('change:lagometerFrame', this, frame, offset);
	},
	addSnapshotFrame: function (ping, flags) {
		var snapshots = this.model.get('snapshots');

		var frame = snapshots.count % LAG_SAMPLES;
		snapshots.samples[frame] = ping;
		snapshots.flags[frame] = flags;
		snapshots.count++;

		this.model.trigger('change:snapshotFrame', this, frame, ping, flags);
	},
	setCounts: function (counts) {
		this.model.set(counts);
	},
	/******************************************************
	 *
	 * Events responding to model changes
	 *
	 ******************************************************/
	updateCrosshairName: function (model, name) {
		var self = this;

		if (name !== null) {
			this.els.crosshairName.text(name).
				removeClass('hidden').
				addClass('visible').
				trigger('recenter');
		} else {
			// We use CSS to fade out and delay immediately hiding the crosshair.
			this.els.crosshairName.
				removeClass('visible').
				addClass('hidden');
		}
	},
	updateScores: function (model) {
		// Doesn't happen often.
		this.render();
	},
	updateEvents: function (model, events) {
		// Doesn't happen often.
		this.render();
	},
	updateFPS: function (model, fps) {
		this.els.fps.text(fps);
	},
	updateWeapons: function (model, weapons) {
		// Doesn't happen often.
		this.render();
	},
	updateWeaponSelect: function (model, select) {
		this.els.weapons.removeClass('selected').
			filter('[data-index="' + select + '"]').addClass('selected');
	},
	updateAmmo: function (model, i, ammo) {
		var $weapon = this.els.weapons.filter('[data-index="' + i + '"]');
		var $ammo = $weapon.find('.ammo');
		$ammo.text(ammo);
	},
	updateHealth: function (model, health) {
		this.els.health.text(health);
		// if (this.model.health === 0) {
		// 	this.healthBar.hide();
		// } else {
		// 	this.healthBar.css('width', (this.model.health / 10) + 'em');
		// 	this.healthBar.show();
		// }
	},
	updateArmor: function (model, armor) {
		this.els.armor.text(armor);
		// if (this.model.armor === 0) {
		// 	this.armorBar.hide();
		// } else {
		// 	this.armorBar.css('width', (this.model.armor / 10) + 'em');
		// 	this.armorBar.show();
		// }
	},
	updateLagometer: function (model, visible) {
		this.els.lagometer.toggle(visible);
	},
	updateLagometerFrame: function (model, frame, offset) {
		var height = (offset / 1000) * 10;

		this.els.lagometerFrames.eq(frame).css({
			height: Math.abs(height) + 'em',
			bottom: height < 0 ? height + 'em' : 0
		});
	},
	updateSnapshotFrame: function (model, frame, ping, flags) {
		var height = (ping / 1000) * 10;

		this.els.snapshotFrames.eq(frame).css({
			height: Math.abs(height) + 'em',
			bottom: height < 0 ? height + 'em' : 0
		});
	},
	updateCounts: function (model) {
		this.els.shaders.text(model.get('shaders'));
		this.els.nodes.text(model.get('nodes') + '/' + model.get('leafs'));
		this.els.surfaces.text(model.get('surfaces'));
		this.els.vertexes.text(model.get('vertexes'));
		this.els.indexes.text(model.get('indexes'));
		this.els.culledModelOut.text(model.get('culledModelOut'));
		this.els.culledModelIn.text(model.get('culledModelIn'));
		this.els.culledModelClip.text(model.get('culledModelClip'));
	},
	renderView: function () {
		this.$el.html(this.template(this.model.toJSON()));

		this.els.fps = this.$el.find('.fps');
		this.els.shaders = this.$el.find('.count-shaders');
		this.els.nodes = this.$el.find('.count-nodes');
		this.els.surfaces = this.$el.find('.count-surfaces');
		this.els.vertexes = this.$el.find('.count-vertexes');
		this.els.indexes = this.$el.find('.count-indexes');
		this.els.culledModelOut = this.$el.find('.count-culled-model-out');
		this.els.culledModelIn = this.$el.find('.count-culled-model-in');
		this.els.culledModelClip = this.$el.find('.count-culled-model-clip');
		this.els.lagometer = this.$el.find('#lagometer-wrapper');
		this.els.lagometerFrames = this.$el.find('#lagometer-wrapper .lag-frame');
		this.els.snapshotFrames = this.$el.find('#lagometer-wrapper .snapshot-frame');
		this.els.crosshairName = this.$el.find('#crosshair-name');
		this.els.weapons = this.$el.find('.weapon');
		this.els.armor = this.$el.find('.armor-text');
		this.els.health = this.$el.find('.health-text');

		return this;
	}
});
