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
	this.originalValue = this.el.value;
};

TextInput.prototype.onBlur = function (ev) {
	if (this.el.value !== this.originalValue) {
		var ev = document.createEvent('Event');
		ev.initEvent('change', true, false);
		this.el.dispatchEvent(ev);
	}
};

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
var KeyInput = function (element, initialValue) {
	var self = this;

	this.el = element;
	this.initialClick = false;
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

	this.el.addEventListener('click', function (ev) {
		self.onClick(ev);
	});
};

KeyInput.prototype.onFocus = function (ev) {
	this.initialClick = true;
	this.originalValue = this.el.value;
};

KeyInput.prototype.onBlur = function (ev) {
	if (this.el.value !== this.originalValue) {
		var ev = document.createEvent('Event');
		ev.initEvent('change', true, false);
		this.el.dispatchEvent(ev);
	}
};

KeyInput.prototype.onKeyPress = function (ev) {
	var keyName = ev.key;

	// Update the actual value.
	if (keyName === 'backspace') {
		this.el.value = null;
	} else {
		this.el.value = keyName;
	}

	// Trigger a blur to clear focus.
	this.el.blur();
};

KeyInput.prototype.onClick = function (ev) {
	// Ignore the initial click that caused the focus.
	if (this.initialClick) {
		this.initialClick = false;
		return;
	}

	var keyName = 'mouse' + ev.button;
	this.el.value = keyName;
	this.el.blur();
};

ko.bindingHandlers.keyinput = {
	init: function(element, valueAccessor, allBindingsAccessor, viewModel, bindingContext) {
		var value = valueAccessor();
		var valueUnwrapped = ko.utils.unwrapObservable(value);
		var input = new KeyInput(element, valueUnwrapped);
	}
};

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
			self.value = !!val;
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
		this.el.value = enabled;

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
}

ko.bindingHandlers.radioinput = {
	init: function(element, valueAccessor, allBindingsAccessor, viewModel, bindingContext) {
		var value = valueAccessor();
		var valueUnwrapped = ko.utils.unwrapObservable(value);
		var input = new RadioInput(element, valueUnwrapped);
	}
};

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

/**
 * Tab component
 *
 * Single tab component for li elements. Walks DOM to find siblings
 * when toggling.
 */
var Tabs = function (element, initialValue) {
	var self = this;

	self.el = element;

	var sections = element.getElementsByTagName('a');

	for (var i = 0; i < sections.length; i++) {
		sections[i].addEventListener('click', function (ev) {
			self.show(ev);
		});

		// Select the default tab.
		if (i === initialValue) {
			sections[i].click();
		}
	}
};

Tabs.prototype.show = function (ev) {
	var tab = ev.target;
	var tabId = tab.getAttribute('href').replace('#', '');

	// Don't activate if we're already the active tab.
	if (HasClass(tab.parentNode, 'active')) {
		return;
	}

	var content = document.getElementById(tabId);
	if (!content) {
		log('Couldn\'t find content for tab id', tabId);
		return;
	}

	this.activate(tab.parentNode, this.el);
	this.activate(content, content.parentNode);
};

Tabs.prototype.activate = function (element, container) {
	var old = container.getElementsByClassName('active');

	for (var i = 0; i < old.length; i++) {
		RemoveClass(old[i], 'active');
	}

	AddClass(element, 'active');
};

ko.bindingHandlers.tabs = {
	init: function(element, valueAccessor, allBindingsAccessor, viewModel, bindingContext) {
		var value = valueAccessor();
		var valueUnwrapped = ko.utils.unwrapObservable(value);
		var tabs = new Tabs(element, valueUnwrapped);
	}
};
