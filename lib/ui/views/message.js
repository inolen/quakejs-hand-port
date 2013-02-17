define(function (require) {

var ko = require('knockout');

return function (UI) {

var MAX_CONSOLE_MESSAGES = 12;

function MessageMenuModel() {
	var self = this;

	self.visible = ko.observable(false);

	self.keyPress = function (data, ev) {
		var keyName = ev.key;

		if (keyName !== 'enter') {
			return;
		}

		var el = ev.target;

		// blur() to update value.
		el.blur();

		// Escape quotes in text.
		var text = el.value.replace(/"/g, '\\"');

		UI.ExecuteBuffer('say "' + text + '"');
		UI.PopMenu();
	};
}

return MessageMenuModel;

};

});