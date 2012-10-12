function PacketEvent(addr, buffer) {
	var bb = new ByteBuffer(buffer, ByteBuffer.LITTLE_ENDIAN);

	for (i = 0; i < svs.clients.length; i++) {
		var c = svs.clients[i];

		if (!c) {
			continue;
		}

		if (_.isEqual(c.netchan.addr, addr)) {
			ExecuteClientMessage(c, bb);
			return;
		}
	}
}

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
	newcl.netchan = com.NetchanSetup(NetSrc.SERVER, addr, socket);

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
	var serverid = msg.readUnsignedInt();
	var messageSequence = msg.readUnsignedInt();
	var type = msg.readUnsignedByte();
	
	client.messageAcknowledge = messageSequence;

	if (client.messageAcknowledge < 0) {
		// Usually only hackers create messages like this.
		// It is more annoying for them to leave them hanging.
		return;
	}

	// If we can tell that the client has dropped the last
	// gamestate we sent them, resend it.
	if (serverid !== sv_serverid()) {
		if (client.messageAcknowledge > client.gamestateMessageNum) {
			SendClientGameState(client);
		}
		return;
	}

	// This client has acknowledged the new gamestate so it's
	// safe to start sending it the real time again.
	if (client.oldServerTime && serverid === sv_serverid()) {
		client.oldServerTime = 0;
	}

	switch (type) {
		case ClientMessage.move:
			UserMove(client, msg, true);
			break;
		case ClientMessage.moveNoDelta:
			UserMove(client, msg, false);
			break;
	}
}


function ClientEnterWorld(client) {
	client.state = ClientState.ACTIVE;

	gm.ClientBegin(client.clientNum);

	// The entity is initialized inside of ClientBegin.
	client.gentity = GentityForNum(client.clientNum);
}

function UserMove(client, msg, delta) {
	var cmd = new UserCmd();

	cmd.serverTime = msg.readUnsignedInt();
	cmd.angles[0] = msg.readFloat();
	cmd.angles[1] = msg.readFloat();
	cmd.angles[2] = msg.readFloat();
	cmd.forwardmove = msg.readByte();
	cmd.rightmove = msg.readByte();
	cmd.upmove = msg.readByte();

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

	var bb = new ByteBuffer(MAX_MSGLEN, ByteBuffer.LITTLE_ENDIAN);

	bb.writeUnsignedInt(client.netchan.outgoingSequence);
	bb.writeUnsignedByte(ServerMessage.gamestate);

	// TODO: Send aggregated configstrings from specific cvars (CVAR_SYSTEMINFO and ClientState.SERVERINFO)
	bb.writeCString('sv_mapname');
	bb.writeCString(sv_mapname());

	bb.writeCString('sv_serverid');
	bb.writeCString(sv_serverid().toString());

	var newBuffer = bb.buffer.slice(0, bb.index);
	com.NetchanSend(client.netchan, newBuffer);
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
