var CurrentGamePartial = UIView.extend({
	template: _.template('{{ include ../templates/CurrentGamePartial.tpl }}'),
	model: {
		address: '192.168.0.102:9001'
	},
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
		COM.ExecuteBuffer('team free');
	},
	teamRed: function () {
		COM.ExecuteBuffer('team red');
	},
	teamBlue: function () {
		COM.ExecuteBuffer('team blue');
	},
	teamSpectator: function () {
		COM.ExecuteBuffer('team spectator');
	},
	renderView: function () {
		this.$el.html(this.template(this.model));
		return this;
	}
});