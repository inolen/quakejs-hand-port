var components = {
	'.input-text':                 TextInput,
	'.input-key':                  KeyInput,
	'.input-radio':                RadioInput,
	'.input-range':                RangeInput,
	'[data-toggle="tab"]':         Tab,
};

/**
 * Custom hasfocus supporting our internal focusing.
 */
ko.bindingHandlers['hasfocus'] = {
	init: function(element, valueAccessor, allBindingsAccessor) {
		var handleElementFocusChange = function () {
			var modelValue = valueAccessor();
			var isFocused = (uil.focusEl === element);
			ko.expressionRewriting.writeValueToProperty(modelValue, allBindingsAccessor, 'hasfocus', isFocused, true);
		};

		ko.utils.registerEventHandler(element, 'focus', handleElementFocusChange);
		ko.utils.registerEventHandler(element, 'blur',  handleElementFocusChange);
	},
	update: function(element, valueAccessor) {
		var value = !!ko.utils.unwrapObservable(valueAccessor()); // force boolean to compare with last value
		value ? element.focus() : element.blur();
	}
};

/**
 * Async image component
 *
 * Load default image into elements decorated with image handle attributes,
 * followed by the real image once it's done loading.
 */
var AsyncImage = function (element, initialValue) {
	var setImageData = function (data) {
		element.style.backgroundRepeat = 'none';
		element.style.backgroundSize = 'contain';
		element.style.backgroundImage = 'url(\'' + data + '\')';
	};

	if (!isNaN(initialValue)) {
		var img = FindImageByHandle(initialValue);
		setImageData(img.data);
	} else {
		var defaultImage = FindImageByHandle(0);
		setImageData(defaultImage.data);

		RegisterImage(initialValue, function (hImage) {
			var img = FindImageByHandle(hImage);
			setImageData(img.data);
		});
	}
};

ko.bindingHandlers.img = {
	update: function(element, valueAccessor, allBindingsAccessor, viewModel, bindingContext) {
		var value = valueAccessor();
		var valueUnwrapped = ko.utils.unwrapObservable(value);

		AsyncImage(element, valueUnwrapped);
	}
};

/**
 * TextInput component
 *
 * General text input component.
 */
var TextInput = function (element, initialValue) {
	var self = this;

	this.el = element;
	this.value = null;
	this.originalValue = null;

	Object.defineProperty(this.el, 'value', {
		get: function () { return self.value; },
		set: function (val) { self.value = val || ''; self.el.innerHTML = self.value; }
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
};

TextInput.prototype.onFocus = function (ev) {
	this.originalValue = this.value;
};

TextInput.prototype.onBlur = function (ev) {
	if (this.value !== this.originalValue) {
		var ev = document.createEvent('Event');
		ev.initEvent('change', true, false);
		this.el.dispatchEvent(ev);
	}
}

TextInput.prototype.onKeyPress = function (ev) {
	var keyName = ev.key;

	if (keyName === 'enter') {
		// Clear focus.
		this.el.blur();
		return;
	}

	if (keyName.length === 1) {
		this.el.value += keyName;
	} else if (keyName === 'space') {
		this.el.value += ' ';
	} else if (keyName === 'backspace') {
		this.el.value = this.el.value.slice(0, -1);
	}
};

ko.bindingHandlers.textinput = {
	init: function(element, valueAccessor, allBindingsAccessor, viewModel, bindingContext) {
		var value = valueAccessor();
		var valueUnwrapped = ko.utils.unwrapObservable(value);
		var input = new TextInput(element, valueUnwrapped);
	}
};

/**
 * Key input components
 *
 * Process key input for binds.
 */
var KeyInput = function (element) {
	var self = this;

	this.el = element;
	this.el.innerHTML = this.val();

	this._originalValue = null;
	this._initialClick = false;

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

KeyInput.prototype.componentName = 'qk_key';

KeyInput.prototype.val = function (newValue) {
	if (arguments.length) {
		this.el.setAttribute('data-value', newValue || '');
		this.el.innerHTML = this.val();
	} else {
		return this.el.getAttribute('data-value');
	}
};

KeyInput.prototype.onFocus = function (ev) {
	this._initialClick = true;
	this._originalValue = this.val();
};

KeyInput.prototype.onBlur = function (ev) {
	if (this.val() !== this._originalValue) {
		var ev = document.createEvent('Event');
		ev.initEvent('change', true, false);
		this.el.dispatchEvent(ev);
	}
};

KeyInput.prototype.onKeyPress = function (ev) {
	var keyName = ev.key;

	// Update the actual value.
	if (keyName === 'backspace') {
		this.val('');
	} else {
		this.val(keyName);
	}

	// Trigger a blur to clear focus.
	this.el.blur();
};

KeyInput.prototype.onClick = function (ev) {
	// Ignore the initial click that caused the focus.
	if (this._initialClick) {
		this._initialClick = false;
		return;
	}

	var keyName = 'mouse' + ev.button;
	this.val(keyName);
	this.el.blur();
};

/**
 * RadioInput component
 */
var RadioInput = function (element) {
	var self = this;

	this.el = element;
	this.el.innerHTML = this.enabled() ? 'on' : 'off';

	this.el.addEventListener('click', function (ev) {
		self.onClick(ev);
	});
};

RadioInput.prototype.componentName = 'qk_radio';

RadioInput.prototype.onClick = function (ev) {
	this.toggle();
};

RadioInput.prototype.enabled = function (enabled) {
	if (arguments.length) {
		// Update the element's data attribute.
		this.el.setAttribute('data-value', enabled ? 1 : 0);
		this.el.innerHTML = this.enabled() ? 'on' : 'off';

		// Trigger changed event.
		var ev = document.createEvent('Event');
		ev.initEvent('change', true, false);
		this.el.dispatchEvent(ev);
	} else {
		return this.el.getAttribute('data-value');
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

	this.$el.bind('click', function (ev) {
		self.onClick(ev);
	});
};

RangeInput.prototype.componentName = 'qk_range';

RangeInput.prototype.val = function (newValue) {
	if (arguments.length) {
		this.$el[0].setAttribute('data-value', newValue);
		this._refreshSlider();

		// Trigger changed event.
		var ev = document.createEvent('Event');
		ev.initEvent('change', true, false);
		this.$el[0].dispatchEvent(ev);
	} else {
		return this.$el[0].getAttribute('data-value');
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

	var range = this.max() - this.min();
	var scale = (ev.screenX - left) / width;

	this.val(this.min() + scale * range);
};

RangeInput.prototype._refreshSlider = function () {
	var left = this.$el.offset().left;
	var width = this.$el.width();

	// AP - This is really lame, but the DOM doesn't provide us a 'show'
	// event. Often we're initialized the same frame as the container,
	// in which case it will take a frame before jQuery returns us a valid
	// offset.
	if (!left && !width) {
		var self = this;
		setTimeout(function () { self._refreshSlider(); }, 1);
		return;
	}

	var range = this.max() - this.min();
	var scale = (this.val() - this.min()) / range;

	// Update the slider position.
	this.$slider.css({
		left: scale * width
	});
};

/**
 * Tab component
 *
 * Single tab component for li elements. Walks DOM to find siblings
 * when toggling.
 */
var Tab = function (element) {
	var self = this;

	this.element = $(element);

	this.element.on('click', function () {
		self.show();
	});
};

Tab.prototype.componentName = 'qk_tab';

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
	var $active = container.find('> .active');

	$active.removeClass('active');
	element.addClass('active');

	if (callback) {
		callback();
	}
};
