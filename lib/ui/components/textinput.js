define(function (require) {

var ko = require('knockout');

return function (UI) {

/**
 * TextInput component
 *
 * General text input component.
 */
var TextInput = function (element, initialValue) {
	var self = this;

	this.el = element;
	this.value = null;
	this.originalValue = null;

	Object.defineProperty(this.el, 'value', {
		get: function () { return self.value; },
		set: function (val) { self.value = val || ''; self.el.innerHTML = self.value || '&nbsp;'; }
	});
	this.el.value = initialValue;

	this.el.addEventListener('focus', function (ev) {
		self.onFocus(ev);
	});

	this.el.addEventListener('blur', function (ev) {
		self.onBlur(ev);
	});

	this.el.addEventListener('keypress', function (ev) {
		self.onKeyPress(ev);
	});
};

TextInput.prototype.onFocus = function (ev) {
	this.originalValue = this.el.value;
};

TextInput.prototype.onBlur = function (ev) {
	if (this.el.value !== this.originalValue) {
		var ev = document.createEvent('Event');
		ev.initEvent('change', true, false);
		this.el.dispatchEvent(ev);
	}
};

TextInput.prototype.onKeyPress = function (ev) {
	var keyName = ev.key;

	if (keyName === 'enter') {
		// Clear focus.
		this.el.blur();
		return;
	}

	if (keyName.length === 1) {
		this.el.value += keyName;
	} else if (keyName === 'space') {
		this.el.value += ' ';
	} else if (keyName === 'backspace') {
		this.el.value = this.el.value.slice(0, -1);
	}
};

ko.bindingHandlers.textinput = {
	init: function(element, valueAccessor, allBindingsAccessor, viewModel, bindingContext) {
		var value = valueAccessor();
		var valueUnwrapped = ko.utils.unwrapObservable(value);
		var input = new TextInput(element, valueUnwrapped);
	}
};

};

});