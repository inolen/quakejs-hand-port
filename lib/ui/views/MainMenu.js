var MainMenu = UIView.extend({
	template: _.template('{{ include ../templates/MainMenu.tpl }}'),
	initialize: function () {
		this.render();
	},
	renderView: function () {
		this.$el.html(this.template(this.model));

		return this;
	}
});