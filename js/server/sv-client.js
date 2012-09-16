define('server/sv-client', [], function () {
	return function (bg) {
		return {
			ClientThink: function (client, cmd) {
				client.lastUsercmd = cmd;

				//VM_Call( gvm, GAME_CLIENT_THINK, cl - svs.clients );
			},

			ClientEnterWorld: function (client, cmd) {
				client.lastUsercmd = cmd;

				// call the game begin function
				//VM_Call( gvm, GAME_CLIENT_BEGIN, client - svs.clients );
			},

			UserMove: function (client, cmd) {
				this.ClientThink(client, cmd);
			},

			ClientConnect: function () {

			}
		};
	};
});