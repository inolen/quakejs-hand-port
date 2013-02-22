define(function (require) {

var ko = require('knockout');

return function (UI) {

/**
 * Key input components
 *
 * Process key input for binds.
 */
var KeyInput = function (element, initialValue) {
	var self = this;

	this.el = element;
	this.initialClick = false;
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

	this.el.addEventListener('click', function (ev) {
		self.onClick(ev);
	});
};

KeyInput.prototype.onFocus = function (ev) {
	this.initialClick = true;
	this.originalValue = this.el.value;
};

KeyInput.prototype.onBlur = function (ev) {
	if (this.el.value !== this.originalValue) {
		var ev = document.createEvent('Event');
		ev.initEvent('change', true, false);
		this.el.dispatchEvent(ev);
	}
};

KeyInput.prototype.onKeyPress = function (ev) {
	var keyName = ev.key;

	// Update the actual value.
	if (keyName === 'backspace') {
		this.el.value = null;
	} else {
		this.el.value = keyName;
	}

	// Trigger a blur to clear focus.
	this.el.blur();
};

KeyInput.prototype.onClick = function (ev) {
	// Ignore the initial click that caused the focus.
	if (this.initialClick) {
		this.initialClick = false;
		return;
	}

	var keyName = 'mouse' + ev.button;
	this.el.value = keyName;
	this.el.blur();
};

ko.bindingHandlers.keyinput = {
	init: function(element, valueAccessor, allBindingsAccessor, viewModel, bindingContext) {
		var value = valueAccessor();
		var valueUnwrapped = ko.utils.unwrapObservable(value);
		var input = new KeyInput(element, valueUnwrapped);
	}
};

};

});