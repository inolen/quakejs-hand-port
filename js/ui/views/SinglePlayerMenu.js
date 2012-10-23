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
			levels: []
		},
		template: _.template(templateSrc),
		events: {
			'click img': 'levelClicked',
			'click .close': 'closeMenu'
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
					var filename = 'levelshots/' + levels[i];

					ui.FindImage(filename, function (err, img) {
						self.model.levels[i] = {
							name: levels[i],
							url: img.data
						};

						if (++done === levels.length) {
							self.render();
						}
					});
				}(i));
			}
		},
		levelClicked: function (ev) {
			var $img = $(ev.target);
			var levelName = $img.data('name');
			com.ExecuteCmdText('map ' + levelName);
		},
		closeMenu: function () {
			ui.CloseActiveMenu();
		},
		update: function (newModel) {

		},
		render: function () {
			$(this.el).html(this.template(this.model));
			return this;
		}
	});

	return SinglePlayerMenu;
});