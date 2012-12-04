var HudView = UIView.extend({
	model: {
		fps: 0,
		shaders: 0,
		vertexes: 0,
		indexes: 0,
		culledFaces: 0,
		culledModelOut: 0,
		culledModelIn: 0,
		culledModelClip: 0,
		weapons: [],
		weaponSelect: 0,
		ammo: [],
		armor: 'N/A',
		health: 'N/A'
	},
	template: _.template('{{ include ../templates/HudView.tpl }}'),
	// Cache all these elements.
	fpsEl: null,
	shadersEl: null,
	vertexesEl: null,
	indexesEl: null,
	culledFacesEl: null,
	culledModelOutEl: null,
	culledModelInEl: null,
	culledModelClipEl: null,
	ammoEls: null,
	armorEl: null,
	healthEl: null,
	initialize: function () {
		this.render();
	},
	setFPS: function (fps) {
		this.model.fps = fps;
		this.fpsEl.text(this.model.fps);
	},
	setCounts: function (counts) {
		_.extend(this.model, counts);

		this.shadersEl.text(this.model.shaders);
		this.vertexesEl.text(this.model.vertexes);
		this.indexesEl.text(this.model.indexes);
		this.culledFacesEl.text(this.model.culledFaces);
		this.culledModelOutEl.text(this.model.culledModelOut);
		this.culledModelInEl.text(this.model.culledModelIn);
		this.culledModelClipEl.text(this.model.culledModelClip);
	},
	setWeapons: function (currentWeapons, selected) {
		var render = false;

		// Update weapons list.
		for (var i = 0; i < currentWeapons.length; i++) {
			var weaponInfo = currentWeapons[i];

			// Re-render if the current weapon info changed.
			if (this.model.weapons[i] !== weaponInfo) {
				this.model.weapons[i] = weaponInfo;
				render = true;
			}
		}

		// Update selected weapon.
		if (this.model.weaponSelect !== selected) {
			this.model.weaponSelect = selected;
			render = true;
		}

		if (render) {
			this.render();
		}
	},
	setAmmo: function (ammo) {
		var render = false;
		
		for (var i = 0; i < ammo.length; i++) {
			if (this.model.ammo[i] !== ammo[i]) {
				this.model.ammo[i] = ammo[i];
				render = true;
			}
		}
		
		if (render) {
			var hud_i = 0;
			
			for (var i = 0; i < this.model.weapons.length; i++) {
				if (!this.model.weapons[i]) { continue; }
				
				this.ammoEls.eq(hud_i).text(ammo[i]);
				hud_i++;
			}
		}
	},
	setArmor: function (armor) {
		if (this.model.armor !== armor) {
			this.model.armor = armor;
			this.armorText.text(this.model.armor);
			if (this.model.armor === 0) {
				this.armorBar.hide();
			} else {
				this.armorBar.css('width', (this.model.armor / 10) + 'em');
				this.armorBar.show();
			}
		}
	},
	setHealth: function (health) {
		if (this.model.health !== health) {
			this.model.health = health;
			this.healthText.text(this.model.health);
			if (this.model.health === 0) {
				this.healthBar.hide();
			} else {
				this.healthBar.css('width', (this.model.health / 10) + 'em');
				this.healthBar.show();
			}
		}
	},
	renderView: function () {
		this.$el.html(this.template(this.model));
		
		this.fpsEl = this.$el.find('.fps');
		this.shadersEl = this.$el.find('.count-shaders');
		this.vertexesEl = this.$el.find('.count-vertexes');
		this.indexesEl = this.$el.find('.count-indexes');
		this.culledFacesEl = this.$el.find('.count-culled-faces');
		this.culledModelOutEl = this.$el.find('.count-culled-model-out');
		this.culledModelInEl = this.$el.find('.count-culled-model-in');
		this.culledModelClipEl = this.$el.find('.count-culled-model-clip');
		this.ammoEls = this.$el.find('.ammo');
		this.armorText = this.$el.find('.armor.text');
		this.armorBar = this.$el.find('.armor.bar');
		this.healthText = this.$el.find('.health.text');
		this.healthBar = this.$el.find('.health.bar');

		return this;
	}
});
