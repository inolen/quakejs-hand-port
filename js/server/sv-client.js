function ClientConnect(netchan) {
	console.log('SV: A client is direct connecting', netchan);

	// Find a slot for the client.
	var clientNum;
	for (var i = 0; i < MAX_CLIENTS; i++) {
		if (!svs.clients[i]) {
			clientNum = i;
			break;
		}
	}
	if (clientNum === undefined) {
		throw new Error('Server is full');
	}

	var client = svs.clients[clientNum] = new ServerClient();
	client.netchan = netchan;
	gm.ClientBegin(clientNum);
}

function ClientDisconnect(client) {
	// TODO we need to store a client number or something,
	// checking by address is lame.
	var idx;

	for (var i = 0; i < svs.clients.length; i++) {
		var c = svs.clients[i];

		if (!c) {
			continue;
		}

		if (_.isEqual(c.netchan.addr, client.netchan.addr)) {
			idx = i;
			break;
		}
	}

	if (idx === undefined) {
		console.warn('SV: No client found to disconnect.');
		return;
	}

	delete svs.clients[idx];
}

function UserMove(client, cmd) {
	if (!client.gameStateSent) {
		SendClientGameState(client);
		client.gameStateSent = true;
	}

	ClientThink(client, cmd);
}

function SendClientGameState(client) {
	var svop = new Net.ServerOp();
	svop.type = Net.ServerOp.Type.gamestate;
	svop.svop_gamestate = new Net.ServerOp_Gamestate();
	// TODO: Send aggregated configstrings from specific cvars (CVAR_SYSTEMINFO and CS_SERVERINFO)
	var cs = new Net.ServerOp.ConfigString();
	cs.key = 'map';
	cs.value = com.CvarGet('sv_mapname');
	svop.svop_gamestate.configstrings.push(cs);

	NetSend(svop);
}

function ClientThink(client, cmd) {
	var clientNum = GetClientNum(client);
	gm.ClientThink(clientNum, cmd);
}

function GetClientNum(client) {
	for (var i = 0; i < svs.clients.length; i++) {
		var c = svs.clients[i];

		if (!c) {
			continue;
		}

		if (_.isEqual(c.netchan.addr, client.netchan.addr)) {
			return i;
		}
	}

	return -1;
}