define(function (require) {

var DOM = require('ui/dom');

var Scrollable = function (element) {
	var self = this;

	this.el = element;

	// Enable overflow scroll.
	this.el.style['overflow-y'] = 'scroll';

	this.el.addEventListener('wheel', function (ev) {
		self.onWheel(ev);
	});
};

Scrollable.prototype.getFontSize = function () {
	return Number(getComputedStyle(this.el, '').fontSize.match(/(\d*(\.\d*)?)px/)[1]);
};

Scrollable.prototype.onWheel = function (ev) {
	var delta = ev.wheelDeltaY || ev.deltaY;
	this.el.scrollTop += this.getFontSize() * delta;

	var scrollEvent = new UIEvent('scroll', {});
	this.el.dispatchEvent(scrollEvent);
};

return Scrollable;

});