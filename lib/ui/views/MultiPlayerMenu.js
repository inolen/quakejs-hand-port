define('ui/views/MultiPlayerMenu',
[
	'underscore',
	'jquery',
	'backbone',
	'text!ui/templates/MultiPlayerMenu.tpl'
],
function (_, $, Backbone, templateSrc) {
	var imp;

	var MultiPlayerMenu = Backbone.View.extend({
		id: 'multiplayer',
		template: _.template(templateSrc),
		model: {
			address: '192.168.0.102:9001'
		},
		$address: null,
		events: {
			'qk_keypress .address': 'updateAddress',
			'qk_click .connect':    'connect',
			'qk_click .back':       'goBack'
		},
		initialize: function (opts) {
			imp = opts;
			this.render();
		},
		updateAddress: function (ev) {
			var str = ev.value;
			this.$address.text(str);
		},
		connect: function () {
			var address = this.$address.text();
			imp.com_ExecuteBuffer('connect ' + address);
		},
		render: function () {
			this.$el.html(this.template(this.model));
			this.$address = this.$el.find('.address .control-input');

			this.$address.textInput();
			
			this.$el.trigger('qk_render');

			return this;
		},
		goBack: function () {
			imp.ui_PopMenu();
		}
	});

	return MultiPlayerMenu;
});