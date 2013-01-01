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

	if ($el.data('image')) {
		var path = $el.data('image');

		var defaultImage = GetImageByHandle(0);
		setImageData(defaultImage.data);

		RegisterImage(path, function (hImage) {
			var img = GetImageByHandle(hImage);
			setImageData(img.data);
		});
	} else if ($el.data('himage')) {
		var hImage = $el.data('himage');

		var img = GetImageByHandle(hImage);
		setImageData(img.data);
	}
};

AsyncImage.prototype.componentName = 'AsyncImage';

/**
 * TextInput component
 *
 * General text input component.
 */
var TextInput = function (element) {
	var self = this;

	this.$el = $(element);

	this._latchedValue = this.$el.text();
	this._tempValue = '';

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
		this._latchedValue = newValue;

		// Update the element text.
		this.$el.text(this._latchedValue);

		// Trigger changed event.
		this.$el.trigger(new QkChangeEvent(this._latchedValue));
	} else {
		return this._latchedValue;
	}
};

TextInput.prototype.onFocus = function (ev) {
	this._tempValue = this.val();
	if (this._tempValue === undefined) {
		this._tempValue = '';
	}
};

TextInput.prototype.onKeyPress = function (ev) {
	var keyName = ev.keyName;

	if (keyName === 'enter') {
		// Update the actual value.
		this.val(this._tempValue);

		// Trigger a blur to clear focus.
		this.$el.trigger(new QkBlurEvent());
		return;
	}

	if (keyName.length === 1) {
		this._tempValue += keyName;
	} else if (keyName === 'space') {
		this._tempValue += ' ';
	} else if (keyName === 'backspace') {
		this._tempValue = this._tempValue.slice(0, -1);
	}

	// Update element text.
	this.$el.text(this._tempValue);
};

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
		this.$el.text(newValue);

		// Trigger changed event.
		this.$el.trigger(new QkChangeEvent(newValue));
	} else {
		return this.$el.text();
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
 * RadioInput component
 */
var RadioInput = function (element) {
	var self = this;

	this.$el = $(element);

	this.$el.bind('qk_click', function (ev) {
		self.onClick(ev);
	});

};

RadioInput.prototype.componentName = 'RadioInput';

RadioInput.prototype.onClick = function (ev) {
	this.toggle();
};

RadioInput.prototype.enabled = function (enabled) {
	if (arguments.length) {
		// Update the element's data attribute.
		this.$el.attr('data-enabled', enabled ? 'true' : 'false');

		// Trigger changed event.
		this.$el.trigger(new QkChangeEvent(enabled));
	} else {
		return this.$el.attr('data-enabled') === 'true';
	}
};

RadioInput.prototype.toggle = function () {
	this.enabled(!this.enabled());
}

/**
 * RangeInput component
 *
 * Min/max slider component.
 */
var RangeInput = function (element) {
	var self = this;

	var $track = $('<div class="range-track" />');
	var $slider = $('<div class="range-slider" />');

	this.$el = $(element);
	this.$slider = $slider;

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

	this.val(scale * (this.max() - this.min()));
};

RangeInput.prototype._refreshSlider = function () {
	var left = this.$el.offset().left;
	var right = left + this.$el.width();

	// AP - This is really lame, but the DOM doesn't provide us a 'show'
	// event. Often we're initialized the same frame as the container,
	// in which case it will take a frame before jQuery returns us a valid
	// offset.
	if (!left && !right) {
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
	this.activate($target, $target.parent());
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