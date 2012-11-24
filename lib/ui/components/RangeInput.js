define('ui/components/RangeInput', ['jquery'], function ($) {

var RangeInput = function (element) {
	var self = this;

	var $track = $('<div class="input-range-track" />');
	var $slider = $('<div class="input-range-slider" />');

	this.$el = $(element);
	this.$slider = $slider;
	this.refreshCount = 0;

	this.$el.append($track);
	this.$el.append($slider);
	this._refreshSlider();

	this.$el.bind('qk_click', function (ev) {
		self.onClick(ev);
	});
};

RangeInput.prototype.val = function (newValue) {
	if (arguments.length) {
		this.$el.data('value', newValue);
		this._refreshSlider();

		// Trigger changed event.
		this.$el.trigger(new QkChangeEvent(newValue));
	} else {
		return this.$el.data('value');
	}
};

RangeInput.prototype.min = function () {
	if (arguments.length) {
		this.$el.data('min', newValue);
		this._refreshSlider();
	} else {
		return this.$el.data('min') || 0;
	}
};

RangeInput.prototype.max = function (newValue) {
	if (arguments.length) {
		this.$el.data('max', newValue);
		this._refreshSlider();
	} else {
		return this.$el.data('max') || 100;
	}
};

RangeInput.prototype.onClick = function (ev) {
	var left = this.$el.offset().left;
	var width = this.$el.width();
	var scale = (ev.x - left) / width;

	this.val(scale * (this.max - this.min));
};

RangeInput.prototype._refreshSlider = function () {	
	var left = this.$el.offset().left;
	var right = left + this.$el.width();

	// AP - This is really lame, but the DOM doesn't provide us a 'show'
	// event. Often we're initialized the same frame as the container,
	// in which case it will take a frame before jQuery returns us a valid
	// offset.
	if (!left && !right && this.refreshCount++ < 10) {
		var self = this;
		setTimeout(function () { self._refreshSlider(); }, 1);
		return;
	}

	var scale = this.val() / (this.max() - this.min());

	// Update the slider position.
	this.$slider.css({
		left: scale * (right - left)
	});
};

// Export jQuery plugin.
$.fn.rangeInput = function (option) {
	return this.each(function () {
		var $this = $(this),
			data = $this.data('rangeInput');
		
		if (!data) {
			$this.data('rangeInput', (data = new RangeInput(this)));
		};
	});
};

return RangeInput;

});