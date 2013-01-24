var MessageMenu = UIView.extend({
	model: { text: '' },
	template: _.template('{{ include ../templates/MessageMenu.tpl }}'),
	events: {
		'qk_change [name="say"]': 'textChanged',
		'qk_blur [name="say"]': 'textBlur'
	},
	$say: null,
	initialize: function () {
		this.render();
	},
	opened: function () {
		// Reset the text.
		this.$say[0].qk_text.val('', true);

		FocusElement(this.$say.get(0));
	},
	textChanged: function (ev) {
		var text = ev.value;
		if (text === '') {
			return;
		}

		var cmd = 'say "' + text + '"';
		COM.ExecuteBuffer(cmd);
	},
	textBlur: function (ev) {
		this.close();
	},
	renderView: function () {
		this.$el.html(this.template(this.model));
		this.$say = this.$el.find('[name="say"]');
		return this;
	}
});