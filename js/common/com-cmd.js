define('common/com-cmd', ['common/com-defines'], function (q_com_def) {
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