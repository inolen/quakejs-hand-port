/**********************************************************
 *
 * CLIENT -> SERVER
 *
 **********************************************************/

/**
 * SendCommand
 * 
 * Process current input variables into userCommand_t
 * struct for transmission to server.
 */
function SendCommand() {
	// Don't send any message if not connected.
	if (clc.state < ConnectionState.CONNECTED) {
		return;
	}

	CreateNewCommands();
	WritePacket();
}

/**
 * CreateNewCommands
 * 
 * Process current input variables into userCommand_t
 * struct for transmission to server.
 */
function CreateNewCommands() {
	// No need to create usercmds until we have a gamestate.
	if (clc.state < ConnectionState.PRIMED) {
		return;
	}

	cl.cmdNumber++;
	cl.cmds[cl.cmdNumber & CMD_MASK] = CreateCommand();
}

/**
 * CreateCommand
 */
function CreateCommand() {
	var cmd = new UserCmd();

	KeyMove(cmd);
	MouseMove(cmd);

	// Send the current server time so the amount of movement
	// can be determined without allowing cheating.
	cmd.serverTime = cl.serverTime;

	return cmd;
}

/**
 * KeyMove
 */
function KeyMove(cmd) {
	var movespeed = 127;
	var forward = 0, side = 0, up = 0;

	if (forwardKey) forward += movespeed * GetKeyState(forwardKey);
	if (backKey) forward -= movespeed * GetKeyState(backKey);

	if (rightKey) side += movespeed * GetKeyState(rightKey);
	if (leftKey) side -= movespeed * GetKeyState(leftKey);

	if (upKey) { var foobar = GetKeyState(upKey); up += movespeed * foobar; }
	//if (upKey) up -= movespeed * GetKeyState(upKey);

	cmd.forwardmove = ClampChar(forward);
	cmd.rightmove = ClampChar(side);
	cmd.upmove = up;
}

/**
 * MouseMove
 */
function MouseMove(cmd) {
	var oldAngles = vec3.create(cl.viewangles);
	var mx = cl.mouseX * cl_sensitivity();
	var my = cl.mouseY * cl_sensitivity();

	cl.viewangles[YAW] -= mx * 0.022;
	cl.viewangles[PITCH] += my * 0.022;

	if (cl.viewangles[PITCH] - oldAngles[PITCH] > 90) {
		cl.viewangles[PITCH] = oldAngles[PITCH] + 90;
	} else if (oldAngles[PITCH] - cl.viewangles[PITCH] > 90) {
		cl.viewangles[PITCH] = oldAngles[PITCH] - 90;
	}

	// reset
	cl.mouseX = 0;
	cl.mouseY = 0;

	cmd.angles[0] = AngleToShort(cl.viewangles[0]);
	cmd.angles[1] = AngleToShort(cl.viewangles[1]);
	cmd.angles[2] = AngleToShort(cl.viewangles[2]);
}

/**
 * WritePacket
 *
 * Create and send the command packet to the server,
 * including both the reliable commands and the usercmds.
 * 
 * During normal gameplay, a client packet will contain
 * something like:
 *
 * 4    serverid
 * 4    sequence number
 * 4    acknowledged sequence number
 * <optional reliable commands>
 * 1    clc_move or clc_moveNoDelta
 * 1    command count
 * <count * usercmds>
 */
function WritePacket() {
	var msg = new ByteBuffer(MAX_MSGLEN, ByteBuffer.LITTLE_ENDIAN);
	var serverid = parseInt(cl.gameState['sv_serverid']);

	msg.writeInt(serverid);
	// Write the last message we received, which can
	// be used for delta compression, and is also used
	// to tell if we dropped a gamestate
	msg.writeInt(clc.serverMessageSequence);
	// Write the last reliable message we received.
	msg.writeInt(clc.serverCommandSequence);

	// Write any unacknowledged client commands.
	for (var i = clc.reliableAcknowledge + 1; i <= clc.reliableSequence; i++) {
		msg.writeUnsignedByte(ClientMessage.clientCommand);
		msg.writeInt(i);
		msg.writeCString(clc.reliableCommands[i % MAX_RELIABLE_COMMANDS]);
	}

	// Write only the latest client command for now
	// since we're rocking TCP.
	var cmd = cl.cmds[cl.cmdNumber & CMD_MASK];

	msg.writeUnsignedByte(ClientMessage.moveNoDelta);
	msg.writeInt(cmd.serverTime);
	msg.writeUnsignedShort(cmd.angles[0]);
	msg.writeUnsignedShort(cmd.angles[1]);
	msg.writeUnsignedShort(cmd.angles[2]);
	msg.writeByte(cmd.forwardmove);
	msg.writeByte(cmd.rightmove);
	msg.writeByte(cmd.upmove);

	com.NetchanSend(clc.netchan, msg.buffer, msg.index);
}

/**********************************************************
 *
 * SERVER -> CLIENT
 *
 **********************************************************

/**
 * ParseServerMessage
 */
function ParseServerMessage(msg) {
	// Get the reliable sequence acknowledge number.
	clc.reliableAcknowledge = msg.readInt();
	if (clc.reliableAcknowledge < clc.reliableSequence - MAX_RELIABLE_COMMANDS) {
		clc.reliableAcknowledge = clc.reliableSequence;
	}

	var type = msg.readUnsignedByte();

	if (type === ServerMessage.gamestate) {
		ParseGameState(msg);
	} else if (type === ServerMessage.snapshot) {
		ParseSnapshot(msg);
	}
}

/**
 * ParseGameState
 */
function ParseGameState(msg) {
	// Wipe local client state.
	ClearState();

	// TODO make this read in an array of configstrings
	var key = msg.readCString();
	var val = msg.readCString();
	cl.gameState[key] = val;

	key = msg.readCString();
	val = msg.readCString();
	cl.gameState[key] = val;

	console.log('Received gamestate', cl.gameState['sv_mapname'], cl.gameState['sv_serverid']);

	// Let the client game init and load data.
	InitCGame();
}

/**
 * ParseSnapshot
 */
function ParseSnapshot(msg) {
	var newSnap = new ClientSnapshot();

	// We will have read any new server commands in this
	// message before we got to svc_snapshot.
	newSnap.messageNum = clc.serverMessageSequence;
	newSnap.serverCommandNum = clc.serverCommandSequence;

	// TODO should be replaced by the code below
	newSnap.serverTime = msg.readUnsignedInt();
	newSnap.snapFlags = msg.readUnsignedInt();
	newSnap.valid = true;

	/*newSnap.serverTime = snapshot.serverTime;
	newSnap.deltaNum = !snapshot.deltaNum ? -1 : newSnap.messageNum - snapshot.deltaNum;
	newSnap.snapFlags = MSG_ReadByte( msg );

	// If the frame is delta compressed from data that we
	// no longer have available, we must suck up the rest of
	// the frame, but not use it, then ask for a non-compressed
	// message 
	var old;

	if (newSnap.deltaNum <= 0) {
		newSnap.valid = true;		// uncompressed frame
	} else {
		old = cl.snapshots[newSnap.deltaNum % PACKET_BACKUP];
		if (!old.valid) {
			// should never happen
			throw new Error('Delta from invalid frame (not supposed to happen!).');
		} else if (old.messageNum != newSnap.deltaNum) {
			// The frame that the server did the delta from
			// is too old, so we can't reconstruct it properly.
			throw new Error('Delta frame too old.');
		} else if (cl.parseEntitiesNum - old.parseEntitiesNum > MAX_PARSE_ENTITIES-128) {
			throw new Error('Delta parseEntitiesNum too old.');
		} else {
			newSnap.valid = true;	// valid delta parse
		}
	}

	// read areamask
	newSnap.areamask = snapshot.areamask;*/

	// read playerinfo
	/*if (old) {
		MSG_ReadDeltaPlayerstate( msg, &old->ps, &newSnap.ps );
	} else {
		MSG_ReadDeltaPlayerstate( msg, NULL, &newSnap.ps );
	}*/
	ParsePacketPlayerstate(msg, newSnap);

	// read packet entities
	ParsePacketEntities(msg,/* old, */newSnap);

	// if not valid, dump the entire thing now that it has
	// been properly read
	/*if (!newSnap.valid) {
		return;
	}*/

	// clear the valid flags of any snapshots between the last
	// received and this one, so if there was a dropped packet
	// it won't look like something valid to delta from next
	// time we wrap around in the buffer
	/*var oldMessageNum = cl.snap.messageNum + 1;

	if (newSnap.messageNum - oldMessageNum >= PACKET_BACKUP) {
		oldMessageNum = newSnap.messageNum - ( PACKET_BACKUP - 1 );
	}
	for ( ; oldMessageNum < newSnap.messageNum ; oldMessageNum++ ) {
		cl.snapshots[oldMessageNum % PACKET_BACKUP].valid = false;
	}*/
	
	// copy to the current good spot
	cl.snap = newSnap;

	/*cl.snap.ping = 999;
	// calculate ping time
	for (var i = 0 ; i < PACKET_BACKUP ; i++ ) {
		packetNum = (clc.netchan.outgoingSequence - 1 - i) % PACKET_BACKUP;
		if (cl.snap.ps.commandTime >= cl.outPackets[packetNum].p_serverTime) {
			cl.snap.ping = cls.realtime - cl.outPackets[packetNum].p_realtime;
			break;
		}
	}*/

	// save the frame off in the backup array for later delta comparisons
	cl.snapshots[cl.snap.messageNum % PACKET_BACKUP] = cl.snap;

	cl.newSnapshots = true;
}

/**
 * ParsePacketPlayerstate
 */
function ParsePacketPlayerstate(msg, snap) {
	snap.ps.clientNum = msg.readInt();
	snap.ps.commandTime = msg.readInt();
	snap.ps.pm_type = msg.readInt();
	snap.ps.pm_flags = msg.readInt();
	snap.ps.pm_time = msg.readInt();
	snap.ps.gravity = msg.readInt();
	snap.ps.speed = msg.readInt();
	snap.ps.origin[0] = msg.readFloat();
	snap.ps.origin[1] = msg.readFloat();
	snap.ps.origin[2] = msg.readFloat();
	snap.ps.velocity[0] = msg.readFloat();
	snap.ps.velocity[1] = msg.readFloat();
	snap.ps.velocity[2] = msg.readFloat();
	snap.ps.viewangles[0] = msg.readFloat();
	snap.ps.viewangles[1] = msg.readFloat();
	snap.ps.viewangles[2] = msg.readFloat();
	snap.ps.delta_angles[0] = msg.readShort();
	snap.ps.delta_angles[1] = msg.readShort();
	snap.ps.delta_angles[2] = msg.readShort();
}

/**
 * ParsePacketEntities
 */
function ParsePacketEntities(msg, snap) {	
	snap.parseEntitiesNum = cl.parseEntitiesNum;

	while (true) {
		var newnum = msg.readInt();

		if (newnum === (MAX_GENTITIES-1)) {
			break;
		}

		// Save the parsed entity state into the big circular buffer so
		// it can be used as the source for a later delta.
		var state = cl.parseEntities[cl.parseEntitiesNum & (MAX_PARSE_ENTITIES-1)];

		state.number = newnum;
		state.eType = msg.readInt();
		state.eFlags = msg.readInt();

		state.pos.trType = msg.readInt();
		state.pos.trTime = msg.readInt();
		state.pos.trDuration = msg.readInt();
		state.pos.trBase[0] = msg.readFloat();
		state.pos.trBase[1] = msg.readFloat();
		state.pos.trBase[2] = msg.readFloat();
		state.pos.trDelta[0] = msg.readFloat();
		state.pos.trDelta[1] = msg.readFloat();
		state.pos.trDelta[2] = msg.readFloat();

		state.apos.trType = msg.readInt();
		state.apos.trTime = msg.readInt();
		state.apos.trDuration = msg.readInt();
		state.apos.trBase[0] = msg.readFloat();
		state.apos.trBase[1] = msg.readFloat();
		state.apos.trBase[2] = msg.readFloat();
		state.apos.trDelta[0] = msg.readFloat();
		state.apos.trDelta[1] = msg.readFloat();
		state.apos.trDelta[2] = msg.readFloat();

		state.origin[0] = msg.readFloat();
		state.origin[1] = msg.readFloat();
		state.origin[2] = msg.readFloat();
		/*state.origin2[0] = msg.readFloat();
		state.origin2[1] = msg.readFloat();
		state.origin2[2] = msg.readFloat();
		state.angles[0] = msg.readFloat();
		state.angles[1] = msg.readFloat();
		state.angles[2] = msg.readFloat();
		state.angles2[0] = msg.readFloat();
		state.angles2[1] = msg.readFloat();
		state.angles2[2] = msg.readFloat();*/
		state.groundEntityNum = msg.readInt();
		state.modelIndex = msg.readInt();

		cl.parseEntitiesNum++;
		snap.numEntities++;
	}
}