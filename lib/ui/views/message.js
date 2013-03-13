define(function (require) {

var ko = require('knockout');

var MAX_CONSOLE_MESSAGES = 12;

function MessageModel(opts) {
	var self = this;

	self.keyPress = function (data, ev) {
		var keyName = ev.key;

		if (keyName !== 'Enter') {
			return;
		}

		var el = ev.target;

		// blur() to update value.
		el.blur();

		// Escape quotes in text.
		var text = el.value.replace(/"/g, '\\"');

		opts.ExecuteBuffer('say "' + text + '"');

		self.remove();
	};
}

return MessageModel;

});