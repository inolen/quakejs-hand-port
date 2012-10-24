define('ui/views/SinglePlayerMenu',
[
	'underscore',
	'backbone',
	'text!ui/templates/singleplayer.tpl'
],
function (_, Backbone, templateSrc) {
	var sys;
	var com;
	var ui;

	var SinglePlayerMenu = Backbone.View.extend({
		id: 'singleplayer',
		className: 'menu',
		model: {
			defaultImg: null,
			levels: []
		},
		template: _.template(templateSrc),
		events: {
			'mouseenter .levels li': 'levelPreview',
			'click .levels li': 'levelSelect',
			'click .close': 'closeMenu',

		},
		initialize: function (opts) {
			var self = this;

			sys = opts.sys;
			com = opts.com;
			ui = opts.ui;

			var levels = [ 'q3dm7', 'q3dm17', 'q3tourney2' ];
			var done = 0;

			for (var i = 0; i < levels.length; i++) {
				(function (i) {
					var levelName = levels[i];
					var filename = 'levelshots/' + levelName;

					ui.FindImage(filename, function (err, img) {
						if (!self.model.defaultImg) {
							self.model.defaultImg = img.data;
						}

						self.model.levels[i] = {
							name: levelName,
							url: img.data
						};

						if (++done === levels.length) {
							self.render();
						}
					});
				}(i));
			}
		},
		levelPreview: function (ev) {
			var $li = $(ev.target);
			var $preview = this.$el.find('.preview');

			var idx = $li.data('idx');
			var level = this.model.levels[idx];

			$preview.html($('<img>', { src: level.url }));
		},
		levelSelect: function (ev) {
			var $li = $(ev.target);

			var idx = $li.data('idx');
			var level = this.model.levels[idx];

			com.ExecuteCmdText('map ' + level.name);
		},
		closeMenu: function () {
			ui.CloseActiveMenu();
		},
		render: function () {
			this.$el.html(this.template(this.model));
			return this;
		}
	});

	return SinglePlayerMenu;
});