define('ui/components/Tab', ['jquery'], function ($) {

var Tab = function (element) {
	this.element = $(element);
};

Tab.prototype.show = function () {
	var $this = this.element,
		$ul = $this.closest('ul'),
		selector = $this.attr('data-target'),
		previous,
		$target,
		e;

	if (!selector) {
		selector = $this.attr('href')
		selector = selector && selector.replace(/.*(?=#[^\s]*$)/, '') // strip for ie7
	}

	if ($this.parent('li').hasClass('active')) {
		return;
	}

	previous = $ul.find('.active:last a')[0];

	$target = $(selector);

	this.activate($this.parent('li'), $ul);
	this.activate($target, $target.parent(), function () {
		$this.trigger({
			type: 'qk_shown',
			relatedTarget: previous
		});
	});
};

Tab.prototype.activate = function (element, container, callback) {
	var $active = container.find('> .active'),
		transition = callback
				&& $.support.transition
				&& $active.hasClass('fade');

	function next() {
		$active
			.removeClass('active')
			.find('> .dropdown-menu > .active')
			.removeClass('active');

		element.addClass('active');

		if (transition) {
			element[0].offsetWidth // reflow for transition
			element.addClass('in');
		} else {
			element.removeClass('fade');
		}

		if ( element.parent('.dropdown-menu') ) {
			element.closest('li.dropdown').addClass('active');
		}

		callback && callback();
	}

	transition ?
		$active.one($.support.transition.end, next) :
		next();

	$active.removeClass('in');
};

// Export jQuery plugin.
$.fn.tab = function (option) {
	return this.each(function () {
		var $this = $(this),
			data = $this.data('tab');
		
		if (!data) {
			$this.data('tab', (data = new Tab(this)));
		}

		if (typeof option === 'string') {
			data[option]();
		}
	});
};

return Tab;

});