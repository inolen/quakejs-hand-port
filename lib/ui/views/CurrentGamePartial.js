var CurrentGamePartial = UIView.extend({
	template: _.template('{{ include ../templates/CurrentGamePartial.tpl }}'),
	model: {
		address: '192.168.0.102:9001'
	},
	$address: null,
	events: {
		'qk_click .team-free':      'teamFree',
		'qk_click .team-red':       'teamRed',
		'qk_click .team-blue':      'teamBlue',
		'qk_click .team-spectator': 'teamSpectator'
	},
	initialize: function () {
		this.render();
	},
	teamFree: function () {
		com.ExecuteBuffer('team free');
	},
	teamRed: function () {
		com.ExecuteBuffer('team red');
	},
	teamBlue: function () {
		com.ExecuteBuffer('team blue');
	},
	teamSpectator: function () {
		com.ExecuteBuffer('team spectator');
	},
	renderView: function () {
		this.$el.html(this.template(this.model));
		this.$address = this.$el.find('.address .control-input');

		return this;
	}
});