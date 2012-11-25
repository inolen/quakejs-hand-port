var ConnectView = UIView.extend({
	template: _.template('{{ include ../templates/ConnectView.tpl }}'),
	model: {
		loading: 'Loading...'
	},
	loadingEl: null,
	initialize: function () {
		this.render();
	},
	setLoading: function (str) {
		if (!this.loadingEl) this.loadingEl = this.$el.find('.loading');
		this.model.loading = str;
		this.loadingEl.text(this.model.loading);
	},
	renderView: function () {
		this.$el.html(this.template(this.model));
		
		return this;
	}
});