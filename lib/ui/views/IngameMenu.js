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
		'qk_click #settings':       'openSettingsMenu',
		'qk_click .team-free':      'teamFree',
		'qk_click .team-red':       'teamRed',
		'qk_click .team-blue':      'teamBlue',
		'qk_click .team-spectator': 'teamSpectator',
		'qk_click .join-arena':     'joinArena'
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
	joinArena: function (e) {
		var arenaNum = e.target.getAttribute('data-arena');
		COM.ExecuteBuffer('arena ' + arenaNum);
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