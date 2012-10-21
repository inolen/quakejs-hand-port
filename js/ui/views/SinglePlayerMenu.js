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
		model: {
			levels: []
		},
		template: _.template(templateSrc),
		dirty: true,
		events: {
		},
		initialize: function (opts) {
			var self = this;

			ui = opts.ui;
			sys = opts.sys;

			var levelshots = [
				'levelshots/Q3DM7.jpg',
				'levelshots/Q3DM17.jpg',
				'levelshots/Q3TOURNEY2.jpg'
			];

			var done = 0;
			for (var i = 0; i < levelshots.length; i++) {
				(function (i) {
					sys.ReadFile(levelshots[i], 'binary', function (err, data) {
						if (err) throw err;

						self.model.levels[i] = {
							url: 'data:image/jpg;base64,' + btoa(String.fromCharCode.apply(null, new Uint8Array(data)))
						};

						if (++done === levelshots.length) {
							self.render();
						}
					});
				}(i));
			}
		},
		render: function () {
			$(this.el).html(this.template(this.model));
			return this;
		}
	});

	return SinglePlayerMenu;
});