define('ui/views/MultiPlayerMenu',
[
	'underscore',
	'jquery',
	'backbone',
	'text!ui/templates/multiplayer.tpl'
],
function (_, $, Backbone, templateSrc) {
	var imp;

	var MultiPlayerMenu = Backbone.View.extend({
		id: 'multiplayer',
		template: _.template(templateSrc),
		model: {
			address: '192.168.0.102:9001'
		},
		addressEl: null,
		events: {
			'keypress .address': 'updateAddress',
			'click .connect':    'connect',
			'click .back':       'goBack'
		},
		initialize: function (opts) {
			imp = opts;
			this.render();
		},
		updateAddress: function (ev, keyName) {
			var str = imp.ui_ProcessTextInput(this.addressEl.text(), keyName);
			this.addressEl.text(str);
		},
		connect: function () {
			var address = this.addressEl.text();
			imp.com_ExecuteCmdText('connect ' + address);
		},
		render: function () {
			this.$el.html(this.template(this.model));
			this.addressEl = this.$el.find('.address .control-input');
			return this;
		},
		goBack: function () {
			imp.ui_PopMenu();
		}
	});

	return MultiPlayerMenu;
});