define('ui/views/HudView',
[
	'underscore',
	'jquery',
	'backbone',
	'text!ui/templates/hud.tpl'
],
function (_, $, Backbone, templateSrc) {
	var ui;

	var HudView = Backbone.View.extend({
		id: 'hud',
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
		},
		template: _.template(templateSrc),
		// Cache all these elements.
		fpsEl: null,
		shadersEl: null,
		vertexesEl: null,
		indexesEl: null,
		culledFacesEl: null,
		culledModelOutEl: null,
		culledModelInEl: null,
		culledModelClipEl: null,
		weaponsEl: null,
		initialize: function (opts) {
			ui = opts.ui;
			this.render();
		},
		setFPS: function (fps) {
			if (!this.fpsEl) this.fpsEl = this.$el.find('.fps');

			this.model.fps = fps;
			this.fpsEl.text(this.model.fps);
		},
		setCounts: function (counts) {
			if (!this.shadersEl) this.shadersEl = this.$el.find('.count-shaders');
			if (!this.vertexesEl) this.vertexesEl = this.$el.find('.count-vertexes');
			if (!this.indexesEl) this.indexesEl = this.$el.find('.count-indexes');
			if (!this.culledFacesEl) this.culledFacesEl = this.$el.find('.count-culled-faces');
			if (!this.culledModelOutEl) this.culledModelOutEl = this.$el.find('.count-culled-model-out');
			if (!this.culledModelInEl) this.culledModelInEl = this.$el.find('.count-culled-model-in');
			if (!this.culledModelClipEl) this.culledModelClipEl = this.$el.find('.count-culled-model-clip');

			_.extend(this.model, counts);

			this.shadersEl.text(this.model.shaders);
			this.vertexesEl.text(this.model.vertexes);
			this.indexesEl.text(this.model.indexes);
			this.culledFacesEl.text(this.model.culledFaces);
			this.culledModelOutEl.text(this.model.culledModelOut);
			this.culledModelInEl.text(this.model.culledModelIn);
			this.culledModelClipEl.text(this.model.culledModelClip);
		},
		setWeapons: function (weaponInfos) {
			var $wrapper = this.weaponsEl;
			if (!$wrapper) $wrapper = this.weaponsEl = this.$el.find('.weapons');

			var render = false;
			var weapons = this.model.weapons;

			for (var i = 0; i < weaponInfos.length; i++) {
				var weaponInfo = weaponInfos[i];

				if (weapons[i] !== weaponInfo) {
					weapons[i] = weaponInfo;
					render = true;
				}
			}

			if (render) {
				var html = '';
				
				for (var i = 0; i < weapons.length; i++) {
					var weapon = weapons[i];
					if (!weapon) {
						continue;
					}

					var image = ui.GetImageByHandle(weapon.icon);
					html += '<li><img src="' + image.data + '" /></li>';
				}

				$wrapper.html(html);
			}
		},
		render: function () {
			this.$el.html(this.template(this.model));
			return this;
		}
	});

	return HudView;
});