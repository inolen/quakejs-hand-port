/**
 * ClientRequest
 *
 * Called when a client is attempting to connect to the server,
 * we should check the banlist here.
 */
function ClientRequest(addr) {
	// if (denied) {
	// 	NET_OutOfBandPrint( QS.NS_SERVER, from, "print\n%s\n", str );
	// 	Com_DPrintf ("Game rejected a connection: %s.\n", str);
	// 	return false;
	// }

	return true;
}

/**
 * ClientAccept
 *
 * Called when a client acception has been accepted, but before
 * its game-level connection string has been received.
 */
function ClientAccept(socket) {
	socket.onmessage = function (buffer) {
		PacketEvent(socket, buffer);
	};

	socket.onclose = function () {
		ClientDisconnected(socket);
	};
}

/**
 * ClientEnterServer
 *
 * Called after a client has been accepted and its game-level
 * connect request has been processed.
 */
function ClientEnterServer(socket, data) {
	if (!Running()) {
		return;
	}

	// Find a slot for the client.
	var clientNum;
	for (var i = 0; i < sv_maxClients.get(); i++) {
		if (svs.clients[i].state === CS.FREE) {
			clientNum = i;
			break;
		}
	}
	if (clientNum === undefined) {
		COM.NetOutOfBandPrint(socket, 'print', 'Server is full.');
		log('Rejected a connection.');
		return;
	}

	var com_protocol = Cvar.AddCvar('com_protocol');
	var version = data.protocol;
	if(version !== com_protocol.get()) {
		COM.NetOutOfBandPrint(socket, 'print', 'Server uses protocol version ' + com_protocol.get() + ' (yours is ' + version + ').');
		log('Rejected connect from version', version);
		return;
	}

	// Create the client.
	var newcl = svs.clients[clientNum];
	newcl.reset();

	newcl.netchan = COM.NetchanSetup(socket);
	newcl.userinfo = data.userinfo;

	// Give the game a chance to modify the userinfo.
	GM.ClientConnect(clientNum, true);
	UserinfoChanged(newcl);

	log('Going from CS_FREE to CS_CONNECTED for ', clientNum);

	newcl.state = CS.CONNECTED;
	newcl.lastSnapshotTime = svs.time;
	newcl.lastPacketTime = svs.time;

	// Let the client know we've accepted them.
	COM.NetOutOfBandPrint(newcl.netchan.socket, 'connectResponse', null);

	// When we receive the first packet from the client, we will
	// notice that it is from a different serverid and that the
	// gamestate message was not just sent, forcing a retransmit.
	newcl.gamestateMessageNum = -1;
}

/**
 * ClientEnterWorld
 */
function ClientEnterWorld(client, cmd) {
	var clientNum = svs.clients.indexOf(client);

	client.state = CS.ACTIVE;

	log('Going from CS_CONNECTED to CS_ACTIVE for ', clientNum);

	// Resend all configstrings using the cs commands since these are
	// no longer sent when the client is CS_PRIMED.
	UpdateConfigstrings(client);

	client.deltaMessage = -1;
	client.lastSnapshotTime = 0;  // generate a snapshot immediately
	client.gentity = GentityForNum(clientNum);

	if (cmd) {
		cmd.clone(client.lastUserCmd);
	} else {
		client.lastUserCmd = new QS.UserCmd();
	}

	GM.ClientBegin(clientNum);
}

/**
 * DropClient
 *
 * Called when the player is totally leaving the server, either willingly
 * or unwillingly.
 */
function DropClient(client, reason) {
	if (client.state === CS.ZOMBIE) {
		return;  // already dropped
	}

	/*// see if we already have a challenge for this ip
	challenge = &svs.challenges[0];

	for (var i = 0 ; i < MAX_CHALLENGES ; i++, challenge++)
	{
		if(NET_CompareAdr(drop->netchan.remoteAddress, challenge->adr))
		{
			Com_Memset(challenge, 0, sizeof(*challenge));
			break;
		}
	}*/

	// Tell everyone why they got dropped.
	SendServerCommand(null, 'print', client.name + '^' + QS.COLOR.WHITE + ' ' + reason);

	// Call the game function for removing a client
	// this will remove the body, among other things.
	var clientNum = GetClientNum(client);
	GM.ClientDisconnect(clientNum);

	// Add the disconnect command.
	SendServerCommand(client, 'disconnect', reason);

	// Kill the connection.
	COM.NetClose(client.netchan.socket);

	log('Going to CS_ZOMBIE for', client.name);
	client.state = CS.ZOMBIE;  // become free in a few seconds
}

/**
 * ClientDisconnected
 *
 * Called when the socket is closed for a client.
 */
function ClientDisconnected(socket) {
	for (var i = 0; i < svs.clients.length; i++) {
		var client = svs.clients[i];

		if (client.state === CS.FREE) {
			continue;
		}

		if (client.netchan.socket === socket) {
			DropClient(client, 'disconnected');
			return;
		}
	}
}

/**
 * UserMove
 */
function UserMove(client, msg, delta) {
	if (delta) {
		client.deltaMessage = client.messageAcknowledge;
	} else {
		client.deltaMessage = -1;
	}

	var count = msg.readInt8(msg);
	if (count < 1) {
		log('UserMove cmd count < 1');
		return;
	}
	if (count > QS.MAX_PACKET_USERCMDS) {
		log('cmdCount > MAX_PACKET_USERCMDS');
		return;
	}

	// NOTE: Only delta the user cmd from another user cmd
	// in this message. If we delta across old commands (e.g.
	// client.lastUserCmd) we'll run into cmd.serverTime
	// never resetting on game restart.
	var cmds = [];
	var oldcmd;

	for (var i = 0; i < count; i++) {
		var cmd = new QS.UserCmd();
		COM.ReadDeltaUsercmd(msg, oldcmd, cmd);
		oldcmd = cmd;
		cmds.push(cmd);
	}

	// Save time for ping calculation.
	client.frames[client.messageAcknowledge % COM.PACKET_BACKUP].messageAcked = svs.time;

	// If this is the first usercmd we have received
	// this gamestate, put the client into the world.
	if (client.state === CS.PRIMED) {
		ClientEnterWorld(client, cmds[0]);
		// now moves can be processed normaly
	}

	if (client.state !== CS.ACTIVE) {
		client.deltaMessage = -1;
		return; // shouldn't happen
	}

	// Usually, the first couple commands will be duplicates
	// of ones we have previously received, but the servertimes
	// in the commands will cause them to be immediately discarded.
	for (var i = 0; i < cmds.length; i++) {
		var cmd = cmds[i];

		// If this is a cmd from before a map_restart ignore it.
		if (cmd.serverTime > cmds[cmds.length - 1].serverTime) {
			continue;
		}

		// Don't execute if this is an old cmd which is already executed
		// these old cmds are included when cl_packetdup > 0
		if (cmd.serverTime <= client.lastUserCmd.serverTime) {
			return;  // continue;
		}

		ClientThink(client, cmd);
	}
}

/**
 * ClientThink
 */
function ClientThink(client, cmd) {
	var clientNum = GetClientNum(client);

	cmd.clone(client.lastUserCmd);

	GM.ClientThink(clientNum);
}

/**
 * SendClientGameState
 */
function SendClientGameState(client) {
	client.state = CS.PRIMED;
	// When we receive the first packet from the client, we will
	// notice that it is from a different serverid and that the
	// gamestate message was not just sent, forcing a retransmit.
	client.gamestateMessageNum = client.netchan.outgoingSequence;

	var msg = new BitStream(svs.msgBuffer);

	msg.writeInt32(client.lastClientCommand);

	msg.writeInt8(COM.SVM.gamestate);
	msg.writeInt32(client.reliableSequence);

	// Write the configstrings.
	var written = 0;
	try {
		for (var key in sv.configstrings) {
			if (!sv.configstrings.hasOwnProperty(key)) {
				continue;
			}

			msg.writeInt8(COM.SVM.configstring);
			msg.writeASCIIString(JSON.stringify({ k: key, v: GetConfigstring(key) }));
		}

		// Write the baselines.
		var nullstate = new QS.EntityState();
		for (var i = 0; i < QS.MAX_GENTITIES; i++) {
			var base = sv.svEntities[i].baseline;
			if (!base.number) {
				continue;
			}
			written++;
			msg.writeInt8(COM.SVM.baseline);
			COM.WriteDeltaEntityState(msg, nullstate, base, true);
		}
	}
	catch (e) {
		log('SendClientGameState error!');
		log('Entities: ' + written);
		log('Configstrings: ' + JSON.stringify(sv.configstrings));

		console.log(e);
		console.trace();

		throw e;
	}

	msg.writeInt8(COM.SVM.EOF);

	msg.writeInt32(GetClientNum(client));

	msg.writeInt8(COM.SVM.EOF);

	COM.NetchanTransmit(client.netchan, msg.buffer, msg.byteIndex);
}

/**
 * UserinfoChanged
 *
 * Pull specific info from a newly changed userinfo string
 * into a more C friendly form.
 */
function UserinfoChanged(client) {
	client.name = client.userinfo['name'];

	// Snaps command.
	var snaps = 20;

	if (snaps < 1) {
		snaps = 1;
	} else if(snaps > sv_fps.get()) {
		snaps = sv_fps.get();
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
 * UpdateUserinfo
 */
function UpdateUserinfo(client, info) {
	client.userinfo = info;
	UserinfoChanged(client);

	// Call game so it can update it's client info.
	var clientNum = GetClientNum(client);
	GM.ClientUserinfoChanged(clientNum);
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
	var serverid = msg.readInt32();

	client.messageAcknowledge = msg.readInt32();
	if (client.messageAcknowledge < 0) {
		// Usually only hackers create messages like this
		// it is more annoying for them to let them hanging.
		return;
	}

	client.reliableAcknowledge = msg.readInt32();

	// NOTE: when the client message is fux0red the acknowledgement numbers
	// can be out of range, this could cause the server to send thousands of server
	// commands which the server thinks are not yet acknowledged in SV_UpdateServerCommandsToClient
	if (client.reliableAcknowledge < client.reliableSequence - COM.MAX_RELIABLE_COMMANDS) {
		// Usually only hackers create messages like this
		// it is more annoying for them to let them hanging.
		client.reliableAcknowledge = client.reliableSequence;
		return;
	}

	// If we can tell that the client has dropped the last
	// gamestate we sent them, resend it.
	if (serverid !== sv.serverId) {
		// TTimo - use a comparison here to catch multiple map_restart.
		if (serverid >= sv.restartedServerId && serverid < sv.serverId) {
			// They just haven't caught the map_restart yet
			log(client.name, 'ignoring pre map_restart / outdated client message');
			return;
		}

		if (client.messageAcknowledge > client.gamestateMessageNum) {
			SendClientGameState(client);
		}
		return;
	}

	// This client has acknowledged the new gamestate so it's
	// safe to start sending it the real time again.
	if (client.oldServerTime && serverid === sv_serverid.get()) {
		client.oldServerTime = 0;
	}

	// Read optional clientCommand strings.
	var type;

	while (true) {
		type = msg.readUint8();

		if (type === COM.CLM.EOF) {
			break;
		}

		if (type !== COM.CLM.clientCommand) {
			break;
		}

		if (!ParseClientCommand(client, msg)) {
			return;  // we couldn't execute it because of the flood protection
		}

		if (client.state === CS.ZOMBIE) {
			return;  // disconnect command
		}
	}

	// Read the usercmd_t.
	switch (type) {
		case COM.CLM.move:
			UserMove(client, msg, true);
			break;
		case COM.CLM.moveNoDelta:
			UserMove(client, msg, false);
			break;
	}
}

/**
 * ParseClientCommand
 */
function ParseClientCommand(client, msg) {
	var sequence = msg.readInt32();

	var cmd;
	try {
		var str = msg.readASCIIString();
		cmd = JSON.parse(str);
	} catch (e) {
		DropClient(client, 'Failed to parse command');
		return;
	}

	// See if we have already executed it.
	if (client.lastClientCommand >= sequence) {
		return true;
	}

	// Drop the connection if we have somehow lost commands
	if (sequence > client.lastClientCommand + 1 ) {
		log('Client', client.name, 'lost', sequence - client.lastClientCommand, 'clientCommands');
		DropClient(client, 'Lost reliable commands');
		return false;
	}

	// // Malicious users may try using too many string commands
	// // to lag other players. If we decide that we want to stall
	// // the command, we will stop processing the rest of the packet,
	// // including the usercmd. This causes flooders to lag themselves
	// // but not other people.
	// // We don't do this when the client hasn't been active yet since it's
	// // normal to spam a lot of commands when downloading.
	// if ( !com_cl_running->integer &&
	// 	cl->state >= CS_ACTIVE &&
	// 	sv_floodProtect->integer &&
	// 	svs.time < cl->nextReliableTime ) {
	// 	// ignore any other text messages from this client but let them keep playing
	// 	// TTimo - moved the ignored verbose to the actual processing in SV_ExecuteClientCommand, only printing if the core doesn't intercept
	// 	clientOk = qfalse;
	// }

	// Don't allow another command for one second.
	client.nextReliableTime = svs.time + 1000;

	ExecuteClientCommand(client, cmd);

	client.lastClientCommand = sequence;

	return true;  // Continue procesing.
}

/**
 * ExecuteClientCommand
 */
function ExecuteClientCommand(client, cmd) {
	if (cmd.type === 'userinfo') {
		UpdateUserinfo(client, cmd.data);
		return;
	}
	// Since we're on TCP the disconnect is handled as a result
	// of a socket close event.
	// else if (cmd.type === 'disconnect') {
	// 	Disconnect(client);
	// }

	// Pass unknown strings to the game.
	if (sv.state === SS.GAME && (client.state === CS.ACTIVE || client.state === CS.PRIMED)) {
		var clientNum = GetClientNum(client);
		GM.ClientCommand(clientNum, cmd);
	}
}