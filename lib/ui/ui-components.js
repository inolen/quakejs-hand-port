/**
 * RegisterComponent
 *
 * Attach a component to a UI element.
 */
function RegisterComponent(type, element) {
	if (!type.prototype.componentName) {
		error('Type must define a component name property.');
	}

	var $el = $(element),
		data = $el.data(type.prototype.componentName);

	if (!data) {
		$el.data(type.prototype.componentName, (data = new type($el)));
	}
	
	return data;
}

/**
 * Async image component
 *
 * Load default image into elements decorated with image handle attributes,
 * followed by the real image once it's done loading.
 */
var AsyncImage = function (element) {
	var $el = $(element);

	var setImageData = function (data) {
		$el.css({
			'background-size': 'cover',
			'background-image': 'url(\'' + data + '\')'
		});
	};

	// If a physical path is specified, first convert that to a handle.
	if ($el.data('image')) {
		var path = $el.data('image');

		$el.data('himage', RegisterImage(path));
	}

	// Async load and process the image.
	if ($el.data('himage')) {
		var hImage = $el.data('himage');

		// Use first image by default.
		setImageData(FindImageByName('*default').data);

		//
		ImageOnLoad(hImage, function (img) {
			setImageData(img.data);
		});
	}
};

AsyncImage.prototype.componentName = 'AsyncImage';

/**
 * Key input components
 *
 * Process key input for binds.
 */
var KeyInput = function (element) {
	var self = this;

	this.$el = $(element);

	this.$el.bind('qk_keypress', function (ev) {
		self.onKeyPress(ev);
	});
};

KeyInput.prototype.componentName = 'KeyInput';

KeyInput.prototype.val = function (newValue) {
	if (arguments.length) {
		this._value = newValue;
		this.$el.text(this._value);

		// Trigger changed event.
		this.$el.trigger(new QkChangeEvent(this._value));
	} else {
		return this._value;
	}
};

KeyInput.prototype.onKeyPress = function (ev) {
	// Update the actual value.
	if (ev.keyName === 'backspace') {
		this.val('');
	} else {
		this.val(ev.keyName);
	}

	// Trigger a blur to clear focus.
	this.$el.trigger(new QkBlurEvent());
};

/**
 * RangeInput component
 *
 * Min/max slider component.
 */
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

RangeInput.prototype.componentName = 'RangeInput';

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

RangeInput.prototype.min = function (newValue) {
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

/**
 * TextInput component
 *
 * General text input component.
 */
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

TextInput.prototype.componentName = 'TextInput';

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

/**
 * Tab component
 *
 * Single tab component for li elements. Walks DOM to find siblings
 * when toggling.
 */
var Tab = function (element) {
	this.element = $(element);
};

Tab.prototype.componentName = 'Tab';

Tab.prototype.show = function () {
	var $this = this.element,
		$ul = $this.closest('ul'),
		selector = $this.attr('data-target'),
		previous,
		$target,
		e;

	if (!selector) {
		selector = $this.attr('href');
		selector = selector && selector.replace(/.*(?=#[^\s]*$)/, '');  // strip for ie7
	}

	if ($this.parent('li').hasClass('active')) {
		return;
	}

	previous = $ul.find('.active:last a')[0];

	$target = $(selector);

	this.activate($this.parent('li'), $ul);
	this.activate($target, $target.parent(), function () {
		$this.trigger({
			type: 'qk_render'
		});
	});
};

Tab.prototype.activate = function (element, container, callback) {
	var $active = container.find('> .active'),
		transition = callback &&
			$.support.transition &&
			$active.hasClass('fade');

	function next() {
		$active
			.removeClass('active')
			.find('> .dropdown-menu > .active')
			.removeClass('active');

		element.addClass('active');

		if (transition) {
			var noop = element[0].offsetWidth;  // reflow for transition
			element.addClass('in');
		} else {
			element.removeClass('fade');
		}

		if (element.parent('.dropdown-menu')) {
			element.closest('li.dropdown').addClass('active');
		}

		if (callback) {
			callback();
		}
	}

	if (transition) {
		$active.one($.support.transition.end, next);
	} else {
		next();
	}

	$active.removeClass('in');
};