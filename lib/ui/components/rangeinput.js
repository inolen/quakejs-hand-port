define(function (require) {

var ko = require('knockout');

return function (UI) {

/**
 * RangeInput component
 *
 * Min/max slider component.
 */
var RangeInput = function (element, initialValue) {
	var self = this;

	var track = document.createElement('div');
	track.setAttribute('class', 'range-track');

	var slider = document.createElement('div');
	slider.setAttribute('class', 'range-slider');

	element.appendChild(track);
	element.appendChild(slider);

	this.el = element;
	this.slider = slider;
	this.value = null;

	Object.defineProperty(this.el, 'value', {
		get: function () { return self.value; },
		set: function (val) { self.value = parseFloat(val); self.updateSlider(); }
	});
	this.el.value = initialValue;

	this.el.addEventListener('click', function (ev) {
		self.onClick(ev);
	});
};

RangeInput.prototype.min = function () {
	var min = parseInt(this.el.getAttribute('min'), 10);
	return !isNaN(min) ? min : 0;
};

RangeInput.prototype.max = function (newValue) {
	var max = parseInt(this.el.getAttribute('max'), 10);
	return !isNaN(max) ? max : 0;
};

RangeInput.prototype.onClick = function (ev) {
	var width = this.el.offsetWidth;

	var range = this.max() - this.min();
	var scale = ev.clientX / width;

	this.el.value = this.min() + scale * range;

	// Trigger changed event.
	var ev = document.createEvent('Event');
	ev.initEvent('change', true, false);
	this.el.dispatchEvent(ev);
};

RangeInput.prototype.updateSlider = function () {
	var width = this.el.offsetWidth;

	// AP - updateSlider is called the same frame the container is initialized,
	// in which case it will take a frame before the DOM jQuery returns us a
	// valid width
	if (!width) {
		var self = this;
		setTimeout(function () { self.updateSlider(); }, 0);
		return;
	}

	var range = this.max() - this.min();
	var scale = ((this.el.value - this.min()) / range) * 100.0;

	// Update the slider position.
	this.slider.style.left = scale + '%';
};

ko.bindingHandlers.rangeinput = {
	init: function(element, valueAccessor, allBindingsAccessor, viewModel, bindingContext) {
		var value = valueAccessor();
		var valueUnwrapped = ko.utils.unwrapObservable(value);
		var input = new RangeInput(element, valueUnwrapped);
	}
};

};

});