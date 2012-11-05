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
		template: _.template(templateSrc),
		model: {
			fps: 0,
			shaders: 0,
			vertexes: 0,
			indexes: 0,
			culledFaces: 0,
			culledEnts: 0
		},
		fpsEl: null,
		shadersEl: null,
		vertexesEl: null,
		indexesEl: null,
		culledFacesEl: null,
		culledEntsEl: null,
		initialize: function (opts) {
			ui = opts.ui;
			this.render();
		},
		setFPS: function (fps) {
			if (!this.fpsEl) this.fpsEl = this.$el.find('.fps-value');
			this.model.fps = fps;
			this.fpsEl.text(this.model.fps);
		},
		setShaders: function (shaders) {
			if (!this.shadersEl) this.shadersEl = this.$el.find('.count-shaders');
			this.model.shaders = shaders;
			this.shadersEl.text(this.model.shaders);
		},
		setVertexes: function (vertexes) {
			if (!this.vertexesEl) this.vertexesEl = this.$el.find('.count-vertexes');
			this.model.vertexes = vertexes;
			this.vertexesEl.text(this.model.vertexes);
		},
		setIndexes: function (indexes) {
			if (!this.indexesEl) this.indexesEl = this.$el.find('.count-indexes');
			this.model.indexes = indexes;
			this.indexesEl.text(this.model.indexes);
		},
		setCulledFaces: function (culled) {
			if (!this.culledFacesEl) this.culledFacesEl = this.$el.find('.count-culled-faces');
			this.model.culledFaces = culled;
			this.culledFacesEl.text(this.model.culledFaces);
		},
		setCulledEnts: function (culled) {
			if (!this.culledEntsEl) this.culledEntsEl = this.$el.find('.count-culled-ents');
			this.model.culledEnts = culled;
			this.culledEntsEl.text(this.model.culledEnts);
		},
		render: function () {
			this.$el.html(this.template(this.model));
			return this;
		}
	});

	return HudView;
});