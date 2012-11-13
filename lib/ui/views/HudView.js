define('ui/views/HudView',
[
	'underscore',
	'jquery',
	'backbone',
	'text!ui/templates/hud.tpl'
],
function (_, $, Backbone, templateSrc) {
	var exp;

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
			weaponIconData: [],
			weaponSelect: 0
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
			exp = opts;
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
			var $wrapper = this.weaponsEl;

			var render = false;

			// Update weapons list on model.
			for (var i = 0; i < currentWeapons.length; i++) {
				var weaponInfo = currentWeapons[i];

				// Re-render if the current weapon info changed.
				if (this.model.weapons[i] !== weaponInfo) {
					this.model.weapons[i] = weaponInfo;
					render = true;
				}

				// Also, re-render if the icon changed (async loading..)
				if (weaponInfo) {
					var icon = exp.UI_GetImageByHandle(weaponInfo.icon);

					if (this.model.weaponIconData[i] !== icon.data) {
						this.model.weaponIconData[i] = icon.data;
						render = true;
					}
				}
			}

			// Update selected weapon on model.
			if (this.model.weaponSelect !== selected) {
				this.model.weaponSelect = selected;
				render = true;
			}

			if (render) {
				this.render();
			}
		},
		render: function () {
			this.$el.html(this.template(this.model));
			
			this.fpsEl = this.$el.find('.fps');
			this.shadersEl = this.$el.find('.count-shaders');
			this.vertexesEl = this.$el.find('.count-vertexes');
			this.indexesEl = this.$el.find('.count-indexes');
			this.culledFacesEl = this.$el.find('.count-culled-faces');
			this.culledModelOutEl = this.$el.find('.count-culled-model-out');
			this.culledModelInEl = this.$el.find('.count-culled-model-in');
			this.culledModelClipEl = this.$el.find('.count-culled-model-clip');
			this.weaponsEl = this.$el.find('.weapons');

			return this;
		}
	});

	return HudView;
});