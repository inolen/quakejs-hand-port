define('ui/views/MultiPlayerMenu',
[
	'underscore',
	'jquery',
	'backbone',
	'text!ui/templates/multiplayer.tpl'
],
function (_, $, Backbone, templateSrc) {
	var sys;
	var com;
	var ui;

	var MultiPlayerMenu = Backbone.View.extend({
		id: 'multiplayer',
		className: 'menu',
		template: _.template(templateSrc),
		model: {
			address: '192.168.0.102:9001'
		},
		addressEl: null,
		events: {
			'keypress .address': 'updateAddress',
			'click .connect': 'connect',
			'click .close': 'closeMenu'
		},
		initialize: function (opts) {
			var self = this;

			sys = opts.sys;
			com = opts.com;
			ui = opts.ui;

			this.render();
		},
		updateAddress: function (ev, keyName) {
			var str = ui.ProcessTextInput(this.addressEl.text(), keyName);
			this.addressEl.text(str);
		},
		connect: function () {
			var address = this.addressEl.text();
			com.ExecuteCmdText('connect ' + address);
		},
		closeMenu: function () {
			ui.CloseActiveMenu();
		},
		render: function () {
			this.$el.html(this.template(this.model));
			this.addressEl = this.$el.find('.address .control-input');
			return this;
		}
	});

	return MultiPlayerMenu;
});