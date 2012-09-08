define('client/cl-console', [], function () {
	return function (q_r, q_bg) {
		var commands = {};

		var console = (function () {
			return commands;
		})();

		return {
			ConInit: function (canvas, gl) {
		 		// Provide the user a way to interface with the client.
				window.$ = console;

				this.AddCommand('map', this.Cmd_LoadMap);
			},

			/**
			 * Command interface.
			 */
			AddCommand: function (cmd, callback) {
				commands[cmd] = callback;
			},

			GetCommandCallback: function (cmd) {
				return commands[cmd];
			},

			/**
			 * Commands
			 */
			Cmd_LoadMap: function (mapName) {
				q_r.LoadMap(mapName);
			}
		};
	};
});