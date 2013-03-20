define(function (require) {

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
	this.caret = TextInput.CARET_INACTIVE;

	Object.defineProperty(this.el, 'value', {
		get: function () { return self.value || ''; },
		set: function (val) {
			self.value = val || '';

			if (self.caret > val.length) {
				self.caret = val.length;
			}

			self._updateHtml();
		}
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

	this.el.addEventListener('keypress', function (ev) {
		self.onKeyPress(ev);
	});
};

TextInput.CARET_INACTIVE = -1;

TextInput.prototype._updateHtml = function () {
	var str = this.el.value;
	var caret = this.caret;

	// Wrap index in span tag.
	if (caret !== TextInput.CARET_INACTIVE) {
		str = str.substr(0, caret) +
			'<span class="caret">' + (str[caret] || '&nbsp;') + '</span>' +
			str.substr(caret + 1);
	}

	this.el.innerHTML = str || '&nbsp;';
};

TextInput.prototype.onFocus = function (ev) {
	this.originalValue = this.el.value;

	this.caret = this.el.value.length;
	this._updateHtml();
};

TextInput.prototype.onBlur = function (ev) {
	if (this.el.value !== this.originalValue) {
		var ev = document.createEvent('Event');
		ev.initEvent('change', true, false);
		this.el.dispatchEvent(ev);
	}

	this.caret = TextInput.CARET_INACTIVE;
	this._updateHtml();
};

TextInput.prototype.onKeyDown = function (ev) {
	if (ev.key === 'Enter') {
		// Clear focus.
		this.el.blur();

		ev.preventDefault();

		return;
	}

	if (ev.key === 'Spacebar') {
		this.insertChar(' ');

		ev.preventDefault();
	}
	if (ev.key === 'Backspace') {
		this.removeChar();

		ev.preventDefault();
	} else if (ev.key === 'Del') {
		this.deleteChar();

		ev.preventDefault();
	} else if (ev.key === 'Left') {
		this.moveLeft();

		ev.preventDefault();
	} else if (ev.key === 'Right') {
		this.moveRight();

		ev.preventDefault();
	}
};

TextInput.prototype.onKeyPress = function (ev) {
	this.insertChar(ev.char);

	ev.preventDefault();
};

TextInput.prototype.insertChar = function (char) {
	var str = this.el.value.substr(0, this.caret) + char + this.el.value.substr(this.caret);

	if (++this.caret > str.length) {
		this.caret = str.length;
	}

	this.el.value = str;
};

TextInput.prototype.removeChar = function () {
	var str = this.el.value.substr(0, this.caret - 1) + this.el.value.substr(this.caret);

	if (--this.caret < 0) {
		this.caret = 0;
	}

	this.el.value = str;
};

TextInput.prototype.deleteChar = function () {
	var str = this.el.value.substr(0, this.caret) + this.el.value.substr(this.caret + 1);

	if (this.caret > str.length) {
		this.caret = str.length;
	}

	this.el.value = str;
};

TextInput.prototype.moveLeft = function () {
	if (--this.caret < 0) {
		this.caret = 0;
	}

	this._updateHtml();
};

TextInput.prototype.moveRight = function () {
	if (++this.caret > this.el.value.length) {
		this.caret = this.el.value.length;
	}

	this._updateHtml();
};

return TextInput;

});