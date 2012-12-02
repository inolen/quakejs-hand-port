var SinglePlayerMenu = UIView.extend({
	model: {
		previewLevel: 0,
		levels: [
			{ name: 'q3dm7' },
			{ name: 'q3dm17' },
			{ name: 'q3tourney2' }
		]
	},
	template: _.template('{{ include ../templates/SinglePlayerMenu.tpl }}'),
	events: {
		'qk_mouseenter .levels li': 'levelPreview',
		'qk_click .levels li':      'levelSelect',
		'qk_click .back' :          'goBack'
	},
	initialize: function () {
		// Get valid image handles for the levelshots.
		for (var i = 0; i < this.model.levels.length; i++) {
			var level = this.model.levels[i];
			level.himage = RegisterImage('levelshots/' + level.name);
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

		com.ExecuteBuffer('map ' + level.name);
	},
	goBack: function () {
		PopMenu();
	},
	renderView: function () {
		this.$el.html(this.template(this.model));

		return this;
	}
});