var MultiPlayerPartial = UIView.extend({
	template: _.template('{{ include ../templates/MultiPlayerPartial.tpl }}'),
	model: {
		address: '192.168.0.102:9001'
	},
	$address: null,
	events: {
		'qk_keypress .address':   'updateAddress',
		'qk_click .connect':      'connect',
		'qk_click .back':         'goBack'
	},
	initialize: function () {
		this.render();
	},
	updateAddress: function (ev) {
		var str = ev.value;
		this.$address.text(str);
	},
	connect: function () {
		var address = this.$address.text();
		com.ExecuteBuffer('connect ' + address);
	},
	goBack: function () {
		PopMenu();
	},
	renderView: function () {
		this.$el.html(this.template(this.model));
		this.$address = this.$el.find('.address .control-input');

		return this;
	}
});