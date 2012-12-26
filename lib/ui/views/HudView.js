var LAG_SAMPLES = 64;

var HudModel = Backbone.Model.extend({
	defaults: function () {
		return {
			fps: 0,
			shaders: 0,
			vertexes: 0,
			indexes: 0,
			culledFaces: 0,
			culledModelOut: 0,
			culledModelIn: 0,
			culledModelClip: 0,
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
			crosshairName: '',
			crosshairAlpha: 0,
			weapons: [],
			weaponSelect: 0,
			ammo: [],
			armor: 'N/A',
			health: 'N/A',
			score1: null,
			score2: null
		};
	},
	setFPS: function (fps) {
		this.set({ 'fps': fps });
	},
	setCounts: function (counts) {
		this.set(counts);
	},
	showLagometer: function () {
		this.set({ 'lagometerVisible': true });
	},
	hideLagometer: function () {
		this.set({ 'lagometerVisible': false });
	},
	addLagometerFrame: function (offset) {
		var frames = this.get('frames');

		var frame = frames.count % LAG_SAMPLES;
		frames.samples[frame] = offset;
		frames.count++;

		this.trigger('change:lagometerFrame', this, frame, offset);
	},
	addSnapshotFrame: function (ping, flags) {
		var snapshots = this.get('snapshots');

		var frame = snapshots.count % LAG_SAMPLES;
		snapshots.samples[frame] = ping;
		snapshots.flags[frame] = flags;
		snapshots.count++;

		this.trigger('change:snapshotFrame', this, frame, ping, flags);
	},
	setCrosshairName: function (name, alpha) {
		this.set({
			'crosshairName': name,
			'crosshairAlpha': alpha
		});
	},
	setWeapon: function (i, weaponInfo, selected) {
		var currentWeapons = this.get('weapons');

		if (currentWeapons[i] !== weaponInfo) {
			currentWeapons[i] = weaponInfo;
			this.trigger('change:weapons', this, currentWeapons);
		}
	},
	setWeaponSelect: function (select) {
		this.set({ 'weaponSelect': select });
	},
	setAmmo: function (i, ammo) {
		var currentAmmo = this.get('ammo');

		if (currentAmmo[i] !== ammo) {
			currentAmmo[i] = ammo;
			this.trigger('change:ammo', this, i, ammo);
		}
	},
	setArmor: function (armor) {
		this.set({ 'armor': armor });
	},
	setHealth: function (health) {
		this.set({ 'health': health });
	},
	setScore1: function (score) {
		this.set({ 'score1': score });
	},
	setScore2: function (score) {
		this.set({ 'score2': score });
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
		this.model.on('change:fps', this.updateFPS, this);
		this.model.on(
			'change:shaders change:vertexes change:indexes ' +
			'change:culledFaces ' +
			'change:culledModelOut change:culledModelIn change:culledModelClip', this.updateCounts, this);
		this.model.on('change:lagometerVisible', this.updateLagometer, this);
		this.model.on('change:lagometerFrame', this.updateLagometerFrame, this);
		this.model.on('change:snapshotFrame', this.updateSnapshotFrame, this);
		this.model.on('change:crosshairName change:crosshairAlpha', this.updateCrosshairName, this);
		this.model.on('change:weapons', this.updateWeapons, this);
		this.model.on('change:weaponSelect', this.updateWeaponSelect, this);
		this.model.on('change:ammo', this.updateAmmo, this);
		this.model.on('change:armor', this.updateArmor, this);
		this.model.on('change:health', this.updateHealth, this);
		this.model.on('change:score1', this.updateScore1, this);
		this.model.on('change:score2', this.updateScore2, this);

		this.render();
	},
	updateFPS: function (model, fps) {
		this.els.fps.text(fps);
	},
	updateCounts: function (model) {
		this.els.shaders.text(model.get('shaders'));
		this.els.vertexes.text(model.get('vertexes'));
		this.els.indexes.text(model.get('indexes'));
		this.els.culledFaces.text(model.get('culledFaces'));
		this.els.culledModelOut.text(model.get('culledModelOut'));
		this.els.culledModelIn.text(model.get('culledModelIn'));
		this.els.culledModelClip.text(model.get('culledModelClip'));
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
	updateCrosshairName: function (model) {
		var name = model.get('crosshairName');
		var alpha = model.get('crosshairAlpha');
		this.els.crosshairName.text(name).trigger('recenter');  // force recentering
		this.els.crosshairName.css('opacity', alpha);
	},
	updateWeapons: function (model, weapons) {
		// Doesn't happen a lot.
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
	updateArmor: function (model, armor) {
		this.els.armor.text(armor);
		// if (this.model.armor === 0) {
		// 	this.armorBar.hide();
		// } else {
		// 	this.armorBar.css('width', (this.model.armor / 10) + 'em');
		// 	this.armorBar.show();
		// }
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
	updateScore1: function (model, score1) {
		// Doesn't happen a lot.
		this.render();
	},
	updateScore2: function (model, score2) {
		// Doesn't happen a lot.
		this.render();
	},
	renderView: function () {
		this.$el.html(this.template(this.model.toJSON()));

		this.els.fps = this.$el.find('.fps');
		this.els.shaders = this.$el.find('.count-shaders');
		this.els.vertexes = this.$el.find('.count-vertexes');
		this.els.indexes = this.$el.find('.count-indexes');
		this.els.culledFaces = this.$el.find('.count-culled-faces');
		this.els.culledModelOut = this.$el.find('.count-culled-model-out');
		this.els.culledModelIn = this.$el.find('.count-culled-model-in');
		this.els.culledModelClip = this.$el.find('.count-culled-model-clip');
		this.els.lagometer = this.$el.find('.lagometer-wrapper');
		this.els.lagometerFrames = this.$el.find('.lagometer-wrapper .lag-frame');
		this.els.snapshotFrames = this.$el.find('.lagometer-wrapper .snapshot-frame');
		this.els.crosshairName = this.$el.find('.crosshair-name');
		this.els.weapons = this.$el.find('.weapon');
		this.els.armor = this.$el.find('.armor-text');
		// this.armorBar = this.$el.find('.armor.bar');
		this.els.health = this.$el.find('.health-text');
		// this.healthBar = this.$el.find('.health.bar');

		return this;
	}
});
