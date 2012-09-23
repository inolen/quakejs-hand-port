function ClientConnect(netchan) {
	console.log('SV: A client is direct connecting', netchan);
	var client = new Client();
	client.netchan = netchan;
	svs.clients.push(client);
}

function ClientDisconnect(client) {
	// TODO we need to store a client number or something,
	// checking by address is lame.
	var idx;

	for (var i = 0; i < svs.clients.length; i++) {
		var c = svs.clients[i];

		if (_.isEqual(c.netchan.addr, client.netchan.addr)) {
			idx = i;
			break;
		}
	}

	if (idx === undefined) {
		console.warn('SV: No client found to disconnect.');
		return;
	}

	svs.clients.splice(idx, 1);
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
	client.lastUsercmd = cmd;

	// TODO: Following q3 convention here.. seems weird.
	client.ps.speed = 320;

	var pm = new PmoveInfo();
	pm.ps = client.ps;
	pm.cmd = cmd;

	com.Pmove(pm);
	//VM_Call( gvm, GAME_CLIENT_THINK, cl - svs.clients );
}

function ClientEnterWorld(client, cmd) {
	client.lastUsercmd = cmd;

	gm.ClientBegin();
}