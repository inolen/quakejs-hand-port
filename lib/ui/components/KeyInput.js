define('ui/components/KeyInput', ['jquery'], function ($) {

var KeyInput = function (element) {
	var self = this;

	this.$el = $(element);

	this.$el.bind('qk_keypress', function (ev) {
		self.onKeyPress(ev);
	});
};

KeyInput.prototype.val = function (newValue) {
	if (arguments.length) {
		this._value = newValue;
		this.$el.text(this._value);

		// Trigger changed event.
		this.$el.trigger(new QkChangeEvent(this._value));
	} else {
		return this._value;
	}
};

KeyInput.prototype.onKeyPress = function (ev) {
	// Update the actual value.
	if (ev.keyName === 'backspace') {
		this.val('');
	} else {
		this.val(ev.keyName);
	}

	// Trigger a blur to clear focus.
	this.$el.trigger(new QkBlurEvent());
};

// Export jQuery plugin.
$.fn.keyInput = function (option) {
	return this.each(function () {
		var $this = $(this),
			data = $this.data('keyInput');

		if (!data) {
			$this.data('keyInput', (data = new KeyInput(this)));
		};
	});
};

return KeyInput;

});