define(function (require) {

var ko = require('vendor/knockout');
var DOM = require('ui/dom');

var MAX_CONSOLE_LINES = 100;

function ConsoleModel(opts) {
	var self = this;

	self.focused = ko.observable(false);
	self.lines = ko.observableArray([]);
	self.shouldScrollToBottom = true;

	self.onMouseDown = function (data, ev) {
		// Don't allow anything to be manually focused.
		ev.preventDefault();
		ev.stopPropagation();
	};

	self.onScroll = function (data, ev) {
		self.shouldScrollToBottom = ev.target.scrollTop === (ev.target.scrollHeight - ev.target.offsetHeight);
	};

	self.scrollToBottom = function (elements) {
		if (!elements[0] || !self.shouldScrollToBottom) {
			return;
		}

		var container = elements[0].parentNode;
		container.scrollTop = container.scrollHeight;
	};

	self.addLine = function (str) {
		// Shift one off the stack if we're full.
		if (self.lines.length >= MAX_CONSOLE_LINES) {
			self.lines.shift();
		}

		self.lines.push(str);
	};

	self.onBlur = function (data, ev) {
		var el = ev.target;

		// Don't execute if we're blur'ing because the console
		// has been removed.
		if (!DOM.containsElement(document, el)) {
			return;
		}

		opts.ExecuteBuffer(el.value);

		el.value = '';

		el.focus();
	};
}

return ConsoleModel;

});