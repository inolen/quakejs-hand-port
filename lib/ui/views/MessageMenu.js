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
		FocusElement(this.$say);
	},
	textChanged: function (ev) {
		var text = ev.value;
		if (text === '') {
			return;
		}

		var cmd = 'say "' + text + '"';
		com.ExecuteBuffer(cmd);

		// Reset the text for next time.
		// Should trigger a qk_blur event.
		this.$say[0].qk_text.val('');
	},
	textBlur: function () {
		this.close();
	},
	renderView: function () {
		this.$el.html(this.template(this.model));
		this.$say = this.$el.find('[name="say"]');
		return this;
	}
});