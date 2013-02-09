var MAX_CONSOLE_EVENTS = 6;

function MessageEvent(type, text) {
	this.type = name;
	this.text = QS.colorize(text);
}

function MessageMenuModel() {
	var self = this;

	self.visible = ko.observable(false);
	self.events = ko.observableArray([]);

	self.textChange = function (data, ev) {
		var text = ev.target.value;
		if (text === '') {
			return;
		}

		// Escape quotes in text.
		text = text.replace(/"/g, '\\"');

		var cmd = 'say "' + text + '"';
		CL.ExecuteBuffer(cmd);

		// Clear text.
		ev.target.value = '';
	};

	self.addEvent = function (type, text) {
		// Shift one off the stack if we're full.
		if (self.events.length >= MAX_CONSOLE_EVENTS) {
			self.events.shift();
		}

		// Add event to stack.
		var ev = new MessageEvent(type, text);
		self.events.push(ev);
	};
}

MessageMenuModel.template = '{{ include ../templates/message-menu.tpl }}';