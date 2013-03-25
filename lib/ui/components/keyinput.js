define(function (require) {

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
		set: function (val) { self.value = val || ''; self.el.innerHTML = self.value || '&nbsp;'; }
	});
	this.el.value = initialValue;

	this.el.addEventListener('focus', function (ev) {
		self.onFocus(ev);
	});

	this.el.addEventListener('blur', function (ev) {
		self.onBlur(ev);
	});

	this.el.addEventListener('keydown', function (ev) {
		self.onKeyDown(ev);
	});

	this.el.addEventListener('click', function (ev) {
		self.onClick(ev);
	});

	this.el.addEventListener('wheel', function (ev) {
		self.onWheel(ev);
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

KeyInput.prototype.onKeyDown = function (ev) {
	var keyName = ev.key;

	// Update the actual value.
	if (keyName === 'Backspace') {
		this.el.value = null;
	} else {
		// Allow multiple comma-separated keys.
		var keys = this.el.value ? this.el.value.split(/[\s,]+/) : [];

		if (keys.indexOf(keyName) === -1) {
			keys.push(keyName);
			this.el.value = keys.join(', ');
		}
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

KeyInput.prototype.onWheel = function (ev) {
	var delta = ev.wheelDeltaY || ev.deltaY;
	var keyName = delta > 0 ? 'mwheeldown' : 'mwheelup';
	this.el.value = keyName;
	this.el.blur();
};

return KeyInput;

});