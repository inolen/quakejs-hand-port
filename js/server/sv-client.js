/**
 * ClientConnect
 */
function ClientConnect(addr, socket, infostr) {
	if (!svs.initialized) {
		return;
	}

	console.log('SV: A client is connecting');

	// Find a slot for the client.
	var clientNum;
	for (var i = 0; i < MAX_CLIENTS; i++) {
		if (svs.clients[i].state == ClientState.FREE) {
			clientNum = i;
			break;
		}
	}
	if (clientNum === undefined) {
		throw new Error('Server is full');
	}

	// Create the client.
	var newcl = svs.clients[clientNum];
	newcl.netchan = com.NetchanSetup(NetSrc.SERVER, addr, socket);
	newcl.state = ClientState.CONNECTED;

	// Save the userinfo
	newcl.userInfo = JSON.parse(infostr);

	// Give the game a chance to reject this connection or modify the userinfo.
	var denied = gm.ClientConnect(clientNum, true);

	if (denied) {
		//NET_OutOfBandPrint( NS_SERVER, from, "print\n%s\n", str );
		//Com_DPrintf ("Game rejected a connection: %s.\n", str);
		return;
	}

	UserinfoChanged(newcl);

	// Let the client know we've accepted them.
	com.NetchanPrint(newcl.netchan, 'connectResponse');

	// When we receive the first packet from the client, we will
	// notice that it is from a different serverid and that the
	// gamestate message was not just sent, forcing a retransmit.
	newcl.gamestateMessageNum = -1;
}

/**
 * DropClient
 *
 * Called when the player is totally leaving the server, either willingly
 * or unwillingly.
 */
function DropClient(client, reason) {
	if (client.state === ClientState.ZOMBIE) {
		return;  // already dropped
	}

	/*// see if we already have a challenge for this ip
	challenge = &svs.challenges[0];

	for (i = 0 ; i < MAX_CHALLENGES ; i++, challenge++)
	{
		if(NET_CompareAdr(drop->netchan.remoteAddress, challenge->adr))
		{
			Com_Memset(challenge, 0, sizeof(*challenge));
			break;
		}
	}*/

	// tell everyone why they got dropped
	//SV_SendServerCommand( NULL, "print \"%s" S_COLOR_WHITE " %s\n\"", drop->name, reason );

	// Call the game function for removing a client
	// this will remove the body, among other things.
	var clientNum = GetClientNum(client);
	gm.ClientDisconnect(clientNum);

	// add the disconnect command
	//SV_SendServerCommand( drop, "disconnect \"%s\"", reason);

	// nuke user info
	//SV_SetUserinfo( drop - svs.clients, "" );
	
	//Com_DPrintf( "Going to CS_ZOMBIE for %s\n", drop->name );
	client.state = ClientState.ZOMBIE;           // become free in a few seconds
}

/**
 * ClientEnterWorld
 */
function ClientEnterWorld(client) {
	var clientNum = svs.clients.indexOf(client);

	client.state = ClientState.ACTIVE;

	// Resend all configstrings using the cs commands since these are
	// no longer sent when the client is CS_PRIMED.
	UpdateConfigstrings(client);

	gm.ClientBegin(clientNum);

	// The entity is initialized inside of ClientBegin.
	client.gentity = GentityForNum(clientNum);
}

/**
 * UserMove
 */
function UserMove(client, msg, delta) {
	var cmd = new UserCmd();

	cmd.serverTime = msg.readInt();
	cmd.angles[0] = msg.readUnsignedShort();
	cmd.angles[1] = msg.readUnsignedShort();
	cmd.angles[2] = msg.readUnsignedShort();
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

/**
 * ClientThink
 */
function ClientThink(client, cmd) {
	var clientNum = GetClientNum(client);
	
	cmd.clone(client.lastUserCmd);

	gm.ClientThink(clientNum);
}

/**
 * SendClientGameState
 */
function SendClientGameState(client) {
	client.state = ClientState.PRIMED;
	// When we receive the first packet from the client, we will
	// notice that it is from a different serverid and that the
	// gamestate message was not just sent, forcing a retransmit.
	client.gamestateMessageNum = client.netchan.outgoingSequence;

	var msg = new ByteBuffer(svs.msgBuffer, ByteBuffer.LITTLE_ENDIAN);

	msg.writeInt(client.lastClientCommand);

	msg.writeByte(ServerMessage.gamestate);

	// Write the configstrings.
	for (var key in sv.configstrings) {
		if (!sv.configstrings.hasOwnProperty(key)) {
			continue;
		}

		var cs = sv.configstrings[key];

		msg.writeByte(ServerMessage.configstring);
		msg.writeCString(key);
		msg.writeCString(JSON.stringify(cs));
	}

	msg.writeByte(ServerMessage.EOF);

	msg.writeInt(GetClientNum(client));

	com.NetchanSend(client.netchan, msg.buffer, msg.index);
}

/**
 * UserinfoChanged
 */
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

/**
 * GetClientNum
 */
function GetClientNum(client) {
	return svs.clients.indexOf(client);
}

/**
 * Disconnect
 */
function Disconnect(client) {
	DropClient(client, 'disconnected');
}

/**********************************************************
 *
 * User message/command processing
 *
 **********************************************************/

/**
 * ExecuteClientMessage
 */
function ExecuteClientMessage(client, msg) {
	var serverid = msg.readInt();

	client.messageAcknowledge = msg.readInt();
	if (client.messageAcknowledge < 0) {
		// Usually only hackers create messages like this
		// it is more annoying for them to let them hanging.
		return;
	}

	cl.reliableAcknowledge = msg.readInt();
	// NOTE: when the client message is fux0red the acknowledgement numbers
	// can be out of range, this could cause the server to send thousands of server
	// commands which the server thinks are not yet acknowledged in SV_UpdateServerCommandsToClient
	if (client.reliableAcknowledge < client.reliableSequence - MAX_RELIABLE_COMMANDS) {
		// Usually only hackers create messages like this
		// it is more annoying for them to let them hanging.
		client.reliableAcknowledge = client.reliableSequence;
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

	// Read optional clientCommand strings.
	var type;

	while (true) {
		type = msg.readUnsignedByte();

		if (type === ClientMessage.EOF) {
			break;
		}

		if (type !== ClientMessage.clientCommand) {
			break;
		}

		if (!ClientCommand(client, msg)) {
			return;	// we couldn't execute it because of the flood protection
		}

		if (client.state === ClientState.ZOMBIE) {
			return;	// disconnect command
		}
	}

	// Read the usercmd_t.
	switch (type) {
		case ClientMessage.move:
			UserMove(client, msg, true);
			break;
		case ClientMessage.moveNoDelta:
			UserMove(client, msg, false);
			break;
	}
}

/**
 * ClientCommand
 */
function ClientCommand(client, msg) {
	var sequence = msg.readInt();
	var str = msg.readCString();

	// See if we have already executed it.
	if (client.lastClientCommand >= sequence) {
		return true;
	}

	// drop the connection if we have somehow lost commands
	if (sequence > client.lastClientCommand + 1 ) {
		//Com_Printf( "Client %s lost %i clientCommands\n", cl->name,  seq - cl->lastClientCommand + 1 );
		DropClient(client, 'Lost reliable commands');
		return false;
	}

	// don't allow another command for one second
	client.nextReliableTime = svs.time + 1000;

	ExecuteClientCommand(client, str);

	cl.lastClientCommand = sequence;
	client.lastClientCommandString = str;

	return true; // continue procesing
}

/**
 * ExecuteClientCommand
 */
function ExecuteClientCommand(client, str) {
	// see if it is a server level command
	/*for (u=ucmds ; u->name ; u++) {
		if (!strcmp (Cmd_Argv(0), u->name) ) {
			u->func( cl );
			bProcessed = qtrue;
			break;
		}
	}*/
	if (str === 'disconnect') {
		Disconnect(client);
	}

	/*// Pass unknown strings to the game.
	if (!u->name && sv.state == SS_GAME && (cl->state == CS_ACTIVE || cl->state == CS_PRIMED)) {
		Cmd_Args_Sanitize();
		VM_Call( gvm, GAME_CLIENT_COMMAND, cl - svs.clients );
	}*/
}