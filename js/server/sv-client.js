function ClientConnect(addr, socket) {
	console.log('SV: A client is direct connecting');

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

	// Create the client.
	var newcl = svs.clients[clientNum] = new ServerClient(clientNum);
	newcl.netchan = new NetChan(addr, socket);

	UserinfoChanged(newcl);

	//console.log('Going from ClientState.FREE to ClientState.CONNECTED for ', client.name);
	newcl.state = ClientState.CONNECTED;

	// When we receive the first packet from the client, we will
	// notice that it is from a different serverid and that the
	// gamestate message was not just sent, forcing a retransmit.
	newcl.gamestateMessageNum = -1;
}

function ClientDisconnect(addr) {
	var i;

	for (i = 0; i < svs.clients.length; i++) {
		var c = svs.clients[i];

		if (!c) {
			continue;
		}

		if (_.isEqual(c.netchan.addr, client.netchan.addr)) {
			delete svs.clients[i];
			return;
		}
	}

	throw new Error('SV: No client found to disconnect.');

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
	if (msg.serverId !== sv_serverid()) {
		if (client.messageAcknowledge > client.gamestateMessageNum) {
			SendClientGameState(client);
		}
		return;
	}

	// This client has acknowledged the new gamestate so it's
	// safe to start sending it the real time again.
	if (client.oldServerTime && msg.serverId === sv_serverid()) {
		client.oldServerTime = 0;
	}

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
		// now moves can be processed normaly
	}

	if (client.state !== ClientState.ACTIVE) {
		return; // shouldn't happen
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
	cs.key = 'sv_mapname';
	cs.value = sv_mapname();
	svop.svop_gamestate.configstrings.push(cs);

	cs = new Net.ServerOp.ConfigString();
	cs.key = 'sv_serverid';
	cs.value = sv_serverid();
	svop.svop_gamestate.configstrings.push(cs);

	console.log('Sending client game state');
	NetSend(client, svop);
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


function UserinfoChanged(client) {
	var snaps = 20;

	if (snaps < 1) {
		snaps = 1;
	} else if(snaps > sv_fps()) {
		snaps = sv_fps();
	}

	snaps = 1000 / snaps;

	if (snaps != client.snapshotMsec) {
		// Reset last sent snapshot so we avoid desync between server frame time and snapshot send time.
		client.lastSnapshotTime = 0;
		client.snapshotMsec = snaps;
	}
}
