define('ui/components/TextInput', ['jquery'], function ($) {

var TextInput = function (element) {
	var self = this;

	this.$el = $(element);
	this.tempValue = '';

	this.$el.bind('qk_focus', function (ev) {
		self.onFocus(ev);
	});

	this.$el.bind('qk_keypress', function (ev) {
		self.onKeyPress(ev);
	});
};

TextInput.prototype.val = function (newValue) {
	if (arguments.length) {
		this._value = newValue;

		// Update the element text.
		this.$el.text(this._value);

		// Trigger changed event.
		this.$el.trigger(new QkChangeEvent(this._value));
	} else {
		return this._value;
	}
};

TextInput.prototype.onFocus = function (ev) {
	this.tempValue = this.val();
	if (this.tempValue === undefined) {
		this.tempValue = '';
	}
};

TextInput.prototype.onKeyPress = function (ev) {
	var keyName = ev.keyName;

	if (keyName === 'enter') {
		// Update the actual value.
		this.val(this.tempValue);

		// Trigger a blur to clear focus.
		this.$el.trigger(new QkBlurEvent());
		return;
	}

	if (keyName.length === 1) {
		this.tempValue += keyName;
	} else if (keyName === 'space') {
		this.tempValue += ' ';
	} else if (keyName === 'backspace') {
		this.tempValue = this.tempValue.slice(0, -1);
	}

	// Update element text.
	this.$el.text(this.tempValue);
};

// Export jQuery plugin.
$.fn.textInput = function (option) {
	return this.each(function () {
		var $this = $(this),
			data = $this.data('textInput');
		
		if (!data) {
			$this.data('textInput', (data = new TextInput(this)));
		};
	});
};

return TextInput;

});