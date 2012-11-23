define('ui/components/RangeInput', ['jquery'], function ($) {

var RangeInput = function (element) {
	var self = this;

	this.$el = $(element);
	this.$slider = $('<div class="input-range-slider" />');
	this.$el.append(this.$slider);

	this.$el.bind('qk_click', function (ev) {
		self.onClick(ev);
	});
};

RangeInput.prototype.onClick = function (ev) {
	var left = this.$el.offset().left;
	var x = ev.x;

	this.$slider.css({
		left: (x - left) + 'px'
	})
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