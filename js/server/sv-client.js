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

	ClientThink(client, cmd);
}

function ClientConnect() {
}