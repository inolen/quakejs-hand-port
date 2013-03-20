define(function (require) {

var ko = require('vendor/knockout');
var EventEmitter = require('vendor/EventEmitter');

var MAX_CONSOLE_MESSAGES = 12;

function MessageModel(opts) {
	var self = this;

	self.checksubmit = function (data, ev) {
		if (ev.key === 'Enter') {
			var el = ev.target;

			// blur() to update value.
			el.blur();

			// Escape quotes in text and execute say command.
			var text = el.value.replace(/"/g, '\\"');
			opts.ExecuteBuffer('say "' + text + '"');

			// Trigger close event.
			self.trigger('close');
		}
	};
}

MessageModel.prototype = new EventEmitter();
MessageModel.prototype.constructor = MessageModel;

return MessageModel;

});