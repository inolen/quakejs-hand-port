define('server/sv-client', [], function () {
	return function (bg) {
		var sv = this;

		function ClientThink(client, cmd) {
			client.lastUsercmd = cmd;

			//VM_Call( gvm, GAME_CLIENT_THINK, cl - svs.clients );
		}

		function ClientEnterWorld(client, cmd) {
			client.lastUsercmd = cmd;

			// call the game begin function
			//VM_Call( gvm, GAME_CLIENT_BEGIN, client - svs.clients );
		}

		function SendClientGameState(client) {
			client.gameStateSent = true;
		}

		function UserMove(client, cmd) {
			// TODO If the user hasn't acknowleged the gamestate, send it.
			if (!client.gameStateSent) {
				sv.SendClientGameState(client);
			}

			sv.ClientThink(client, cmd);
		}

		function ClientConnect() {
		}

		return {
			ClientThink: ClientThink,
			ClientEnterWorld: ClientEnterWorld,
			SendClientGameState: SendClientGameState,
			UserMove: UserMove,
			ClientConnect: ClientConnect
		};
	};
});