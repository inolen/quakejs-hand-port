define('common/com-cmd', [], function () {
	return function () {
		var commands = {};

		return {
			CommandAdd: function (cmd, callback) {
				commands[cmd] = callback;
			},

			CommandGet: function (cmd) {
				return commands[cmd];
			},

			CommandGetAll: function () {
				return commands;
			}
		};
	};
});