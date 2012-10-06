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

	var client = svs.clients[clientNum] = new ServerClient(clientNum);
	client.netchan = netchan;

	//console.log('Going from ClientState.FREE to ClientState.CONNECTED for ', client.name);
	client.state = ClientState.CONNECTED;

	// When we receive the first packet from the client, we will
	// notice that it is from a different serverid and that the
	// gamestate message was not just sent, forcing a retransmit.
	client.gamestateMessageNum = -1;
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

function ExecuteClientMessage(client, msg) {
	client.messageAcknowledge = msg.messageAcknowledge;

	if (client.messageAcknowledge < 0) {
		// Usually only hackers create messages like this.
		// It is more annoying for them to leave them hanging.
		return;
	}

	// If we can tell that the client has dropped the last
	// gamestate we sent them, resend it.
	//if (msg.serverId != sv.serverId) {
		if (client.messageAcknowledge > client.gamestateMessageNum) {
			SendClientGameState(client);
			return;
		}
	//}

	if (msg.type === Net.ClientOp.Type.move) {
		UserMove(client, msg.clop_move);
	}
}


function ClientEnterWorld(client) {
	client.state = ClientState.ACTIVE;

	gm.ClientBegin(client.clientNum);

	// The entity is initialized inside of ClientBegin.
	client.gentity = GentityForNum(client.clientNum);
}

function UserMove(client, cmd) {
	// If this is the first usercmd we have received
	// this gamestate, put the client into the world.
	if (client.state === ClientState.PRIMED) {
		ClientEnterWorld(client);
		// the moves can be processed normaly
	}

	if (client.state !== ClientState.ACTIVE) {
		return;
	}

	ClientThink(client, cmd);
}

function SendClientGameState(client) {
	client.state = ClientState.PRIMED;
	client.gamestateMessageNum = client.netchan.outgoingSequence;

	var svop = new Net.ServerOp();
	svop.type = Net.ServerOp.Type.gamestate;
	svop.svop_gamestate = new Net.ServerOp_Gamestate();

	// TODO: Send aggregated configstrings from specific cvars (CVAR_SYSTEMINFO and ClientState.SERVERINFO)
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