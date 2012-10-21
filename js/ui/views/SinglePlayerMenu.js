define('ui/views/SinglePlayerMenu',
[
	'underscore',
	'backbone',
	'text!ui/templates/singleplayer.tpl'
],
function (_, Backbone, templateSrc) {
	var ui;
	var sys;

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

			ui = opts.ui;
			sys = opts.sys;

			var levels = [ 'q3dm7', 'q3dm17', 'q3tourney2' ];

			var done = 0;
			for (var i = 0; i < levels.length; i++) {
				(function (i) {
					var filename = 'levelshots/' + levels[i] + '.png';

					sys.ReadFile(filename, 'binary', function (err, data) {
						if (err) throw err;

						self.model.levels[i] = {
							name: levels[i],
							url: 'data:image/png;base64,' + btoa(String.fromCharCode.apply(null, new Uint8Array(data)))
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
			console.log('selected', $img.data('name'));
		},
		closeMenu: function () {
			ui.CloseActiveMenu();
		},
		render: function () {
			console.log('rendering');
			$(this.el).html(this.template(this.model));
			return this;
		}
	});

	return SinglePlayerMenu;
});