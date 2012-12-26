var LoadingView = UIView.extend({
	template: _.template('{{ include ../templates/LoadingView.tpl }}'),
	model: {
		mapName: null,
		percent: 0
	},
	loadingEl: null,
	initialize: function () {
		this.render();
	},
	setMapName: function (mapName) {
		this.model.mapName = mapName;
		this.$el.find('.map-name').text(mapName);
	},
	setProgress: function (percent) {
		this.model.percent = percent;
		this.$el.find('.progress .bar').css('width', percent + '%');
	},
	renderView: function () {
		this.$el.html(this.template(this.model));
		return this;
	}
});