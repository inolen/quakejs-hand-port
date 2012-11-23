var RangeInput = function (element) {
	var self = this;

	this.$el = $(element);
	this.$slider = $('<div class="input-range-slider" />');
	this.$el.append(this.$slider);

	this.$el.bind('click', function () {
		self.onClick();
	});
};

RangeInput.prototype.onClick = function () {
	var left = this.$el.offset().left;
	var x = $ptr.offset().left;

	this.$slider.css({
		left: (x - left) + 'px'
	})
};