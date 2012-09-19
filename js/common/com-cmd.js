define('common/com-cmd', [], function () {
	return function () {
		var commands = {};

		function CmdAdd(cmd, callback) {
			commands[cmd] = callback;
		}

		function CmdGet(cmd) {
			return commands[cmd];
		}

		return {
			CmdAdd: CmdAdd,
			CmdGet: CmdGet
		};
	};
});