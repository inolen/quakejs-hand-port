var IngameModel = Backbone.Model.extend({
	defaults: function () {
		return {
			gametype: null,
			team: null,
			arenaNum: null,
			arenas: null
		}
	}
});

var IngameMenu = UIView.extend({
	template: _.template('{{ include ../templates/ingame-menu.tpl }}'),
	model: null,
	events: {
		'click #settings':   'openSettingsMenu',
		'click .join-team':  'joinTeam',
		'click .join-arena': 'joinArena'
	},
	initialize: function () {
		this.model = new IngameModel();

		this.model.on('change:gametype', this.update, this);
		this.model.on('change:team', this.update, this);
		this.model.on('change:arenaNum', this.update, this);
		this.model.on('change:arenas', this.update, this);

		this.render();
	},
	setGametype: function (gametype) {
		this.model.set('gametype', gametype);
	},
	setTeam: function (team) {
		this.model.set('team', team);
	},
	setArena: function (arenaNum) {
		this.model.set('arenaNum', arenaNum);
	},
	setArenas: function (arenas) {
		this.model.set('arenas', arenas);
	},
	openSettingsMenu: function () {
		// PushMenu('settings');
	},
	joinTeam: function (e) {
		var team = e.target.getAttribute('data-team');
		CL.ExecuteBuffer('team ' + team);

		PopAllMenus();
	},
	joinArena: function (e) {
		log('joinArena', e, e.target);
		var arenaNum = e.target.getAttribute('data-arena');
		CL.ExecuteBuffer('arena ' + arenaNum);

		PopAllMenus();
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