define(function (require) {

var ko = require('knockout');

return function (UI) {

/**
 * RadioInput component
 */
var RadioInput = function (element, initialValue) {
	var self = this;

	this.el = element;
	this.value = null;

	Object.defineProperty(this.el, 'value', {
		get: function () {
			return self.value;
		},
		set: function (val) {
			self.value = (!!val) ? 1 : 0;
			// Set actual element attr so CSS can style it.
			self.el.setAttribute('value', self.value);
		}
	});
	this.el.value = initialValue;

	this.el.addEventListener('click', function (ev) {
		self.onClick(ev);
	});
};

RadioInput.prototype.onClick = function (ev) {
	this.toggle();
};

RadioInput.prototype.enabled = function (enabled) {
	if (arguments.length) {
		// Update the element's data attribute.
		this.el.value = enabled

		// Trigger changed event.
		var ev = document.createEvent('Event');
		ev.initEvent('change', true, false);
		this.el.dispatchEvent(ev);
	} else {
		return this.el.value;
	}
};

RadioInput.prototype.toggle = function () {
	this.enabled(!this.enabled());
};

ko.bindingHandlers.radioinput = {
	init: function(element, valueAccessor, allBindingsAccessor, viewModel, bindingContext) {
		var value = valueAccessor();
		var valueUnwrapped = ko.utils.unwrapObservable(value);
		var input = new RadioInput(element, valueUnwrapped);
	}
};

};

});