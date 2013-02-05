var IngameModel = Backbone.Model.extend({
	defaults: function () {
		return {
			gametype: null,
			currentArenaNum: null,
			arenas: null
		}
	}
});

var IngameMenu = UIView.extend({
	template: _.template('{{ include ../templates/IngameMenu.tpl }}'),
	model: null,
	events: {
		'qk_click #settings':   'openSettingsMenu',
		'qk_click .join-team':  'joinTeam',
		'qk_click .join-arena': 'joinArena'
	},
	initialize: function () {
		this.model = new IngameModel();

		this.model.on('change:gametype', this.update, this);
		this.model.on('change:currentArenaNum', this.update, this);
		this.model.on('change:arenas', this.update, this);

		this.render();
	},
	setGametype: function (gametype) {
		this.model.set('gametype', gametype);
	},
	setCurrentArena: function (arenaNum) {
		this.model.set('currentArenaNum', arenaNum);
	},
	setArenas: function (arenas) {
		this.model.set('arenas', arenas);
	},
	openSettingsMenu: function () {
		PushMenu('settings');
	},
	joinTeam: function (e) {
		var team = e.target.getAttribute('data-team');
		CL.ExecuteBuffer('team ' + team);
	},
	joinArena: function (e) {
		var arenaNum = e.target.getAttribute('data-arena');
		CL.ExecuteBuffer('arena ' + arenaNum);
	},
	update: function () {
		// Doesn't happen often.
		this.render();
	},
	renderView: function () {
		this.$el.html(this.template(this.model.toJSON()));

		return this;
	}
});