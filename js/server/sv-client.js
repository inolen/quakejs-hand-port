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

	var svop = new Net.ServerOp();
	svop.type = Net.ServerOp.Type.gamestate;
	svop.svop_gamestate = new Net.ServerOp_Gamestate();
	// TODO: Send aggregated configstrings from specific cvars (CVAR_SYSTEMINFO and CS_SERVERINFO)
	var cs = new Net.ServerOp.ConfigString();
	cs.key = 'map';
	cs.value = 'q3tourney2';
	svop.svop_gamestate.configstrings.push(cs);

	NetSend(svop);
}

function UserMove(client, cmd) {
	if (!client.gameStateSent) {
		SendClientGameState(client);
	}

	ClientThink(client, cmd);
}

function DirectConnect(addr) {
	var client = Object.create(Client);
	client.netchan = netchan;
	clients.push(client);
}

// TODO: Add disconnect support.