var MainMenu = UIView.extend({
	template: _.template('{{ include ../templates/main-menu.tpl }}'),
	initialize: function () {
		this.render();
	},
	renderView: function () {
		this.$el.html(this.template(this.model));

		return this;
	}
});