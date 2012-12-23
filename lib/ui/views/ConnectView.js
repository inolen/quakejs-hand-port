var ConnectView = UIView.extend({
	template: _.template('{{ include ../templates/ConnectView.tpl }}'),
	model: {
		percent: 0
	},
	loadingEl: null,
	initialize: function () {
		this.render();
	},
	setProgress: function (percent) {
		this.model.percent = percent;
		this.$el.find('.progress').css('width', percent + '%');
	},
	renderView: function () {
		this.$el.html(this.template(this.model));

		return this;
	}
});