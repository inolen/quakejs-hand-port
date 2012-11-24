define('ui/views/SinglePlayerMenu',
[
	'underscore',
	'jquery',
	'backbone',
	'text!ui/templates/SinglePlayerMenu.tpl'
],
function (_, $, Backbone, templateSrc) {
	var imp;

	var SinglePlayerMenu = Backbone.View.extend({
		id: 'singleplayer',
		model: {
			previewLevel: 0,
			levels: [
				{ name: 'q3dm7' },
				{ name: 'q3dm17' },
				{ name: 'q3tourney2' }
			]
		},
		template: _.template(templateSrc),
		events: {
			'qk_mouseenter .levels li': 'levelPreview',
			'qk_click .levels li':      'levelSelect',
			'qk_click .back' :          'goBack'
		},
		initialize: function (opts) {
			imp = opts;

			// Get valid image handles for the levelshots.
			for (var i = 0; i < this.model.levels.length; i++) {
				var level = this.model.levels[i];
				level.himage = imp.ui_RegisterImage('levelshots/' + level.name);
			}

			this.render();
		},
		levelPreview: function (ev) {
			var $li = $(ev.target);

			// Hide all preview images.
			$('.preview .preview-image').hide();

			// Show the one for this level.
			var idx = $li.index();
			$('.preview .preview-image').eq(idx).show();
		},
		levelSelect: function (ev) {
			var $li = $(ev.target);

			var idx = $li.index();
			var level = this.model.levels[idx];

			imp.com_ExecuteBuffer('map ' + level.name);
		},
		render: function () {
			this.$el.html(this.template(this.model));

			// Handle async loaded images.
			imp.ui_LoadImagesInElement(this.$el);

			this.$el.trigger('qk_render');

			return this;
		},
		goBack: function () {
			imp.ui_PopMenu();
		}
	});

	return SinglePlayerMenu;
});