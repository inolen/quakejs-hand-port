define('ui/views/SinglePlayerMenu',
[
	'underscore',
	'jquery',
	'backbone',
	'text!ui/templates/singleplayer.tpl'
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
			'mouseenter .levels li': 'levelPreview',
			'click .levels li':      'levelSelect',
			'click .back' :          'goBack'
		},
		initialize: function (opts) {
			imp = opts;

			// Render first.
			this.render();

			// Then async load levelshots.
			var self = this;

			var loadLevelshot = function (i) {
				var $preview = self.$el.find('.preview img');
				var level = self.model.levels[i];

				imp.ui_RegisterImage('levelshots/' + level.name, function (err, img) {
					level.url = img.data;

					// If this is the image for the current level preview,
					// update the image.
					if (self.model.previewLevel === i) {
						$preview.attr('src', level.url);
					}
				});
			};

			for (var i = 0; i < this.model.levels.length; i++) {
				loadLevelshot(i);
			}
		},
		levelPreview: function (ev) {
			var $li = $(ev.target);
			var $preview = this.$el.find('.preview img');

			previewLevel = $li.data('idx');
			var level = this.model.levels[previewLevel];

			$preview.attr('src', level.url);
		},
		levelSelect: function (ev) {
			var $li = $(ev.target);

			var idx = $li.data('idx');
			var level = this.model.levels[idx];

			imp.com_ExecuteCmdText('map ' + level.name);
		},
		render: function () {
			this.$el.html(this.template(this.model));
			return this;
		},
		goBack: function () {
			imp.ui_PopMenu();
		}
	});

	return SinglePlayerMenu;
});