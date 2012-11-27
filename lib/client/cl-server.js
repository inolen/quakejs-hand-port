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
	if (clc.state < CA.CONNECTED) {
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
	if (clc.state < CA.PRIMED) {
		return;
	}

	cl.cmdNumber++;
	cl.cmds[cl.cmdNumber % CMD_BACKUP] = CreateCommand();
}

/**
 * CreateCommand
 */
function CreateCommand() {
	var cmd = new sh.UserCmd();

	CmdButtons(cmd);
	KeyMove(cmd);
	MouseMove(cmd);

	// Merge in cgame values (should only be weapon atm).
	cmd.weapon = cl.cgameWeapon;

	// Send the current server time so the amount of movement
	// can be determined without allowing cheating.
	cmd.serverTime = cl.serverTime;

	return cmd;
}

/**
 * CmdButtons
 */
function CmdButtons(cmd) {
	// Send a button bit even if the key was pressed and released in
	// less than a frame.
	for (var i = 0; i < 15; i++) {
		var btn = cls.inButtons[i];

		if (!btn) {
			continue;
		}

		if (btn.active || btn.wasPressed) {
			cmd.buttons |= 1 << i;
		}

		btn.wasPressed = false;
	}
}

/**
 * KeyMove
 */
function KeyMove(cmd) {
	var movespeed;
	var forward = 0, side = 0, up = 0;

	// adjust for speed key / running
	// the walking flag is to keep animations consistant
	// even during acceleration and develeration
	// if ( in_speed.active ^ cl_run->integer ) {
		movespeed = 127;
		cmd.buttons &= ~BUTTON.WALKING;
	// } else {
	// 	cmd->buttons |= BUTTON_WALKING;
	// 	movespeed = 64;
	// }

	if (cls.inForward) forward += movespeed * GetKeyState(cls.inForward);
	if (cls.inBack) forward -= movespeed * GetKeyState(cls.inBack);

	if (cls.inRight) side += movespeed * GetKeyState(cls.inRight);
	if (cls.inLeft) side -= movespeed * GetKeyState(cls.inLeft);

	if (cls.inUp) { up += movespeed * GetKeyState(cls.inUp); }
	// TODO Add crouching.
	//if (cls.inDown) up -= movespeed * GetKeyState(cls.inDown);

	cmd.forwardmove = QMath.ClampChar(forward);
	cmd.rightmove = QMath.ClampChar(side);
	cmd.upmove = up;
}

/**
 * MouseMove
 */
function MouseMove(cmd) {
	var oldAngles = vec3.set(cl.viewangles, [0, 0, 0]);
	var mx = cl.mouseX * cl_sensitivity();
	var my = cl.mouseY * cl_sensitivity();

	cl.viewangles[QMath.YAW] -= mx * 0.022;
	cl.viewangles[QMath.PITCH] += my * 0.022;

	if (cl.viewangles[QMath.PITCH] - oldAngles[QMath.PITCH] > 90) {
		cl.viewangles[QMath.PITCH] = oldAngles[QMath.PITCH] + 90;
	} else if (oldAngles[QMath.PITCH] - cl.viewangles[QMath.PITCH] > 90) {
		cl.viewangles[QMath.PITCH] = oldAngles[QMath.PITCH] - 90;
	}

	// reset
	cl.mouseX = 0;
	cl.mouseY = 0;

	cmd.angles[0] = QMath.AngleToShort(cl.viewangles[0]);
	cmd.angles[1] = QMath.AngleToShort(cl.viewangles[1]);
	cmd.angles[2] = QMath.AngleToShort(cl.viewangles[2]);
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
var msgBuffer = new ArrayBuffer(MAX_MSGLEN);
function WritePacket() {
	var msg = new ByteBuffer(msgBuffer, ByteBuffer.LITTLE_ENDIAN);
	var serverid = parseInt(cl.serverId, 10);

	msg.writeInt(serverid);
	// Write the last message we received, which can
	// be used for delta compression, and is also used
	// to tell if we dropped a gamestate
	msg.writeInt(clc.serverMessageSequence);
	// Write the last reliable message we received.
	msg.writeInt(clc.serverCommandSequence);

	// Write any unacknowledged client commands.
	for (var i = clc.reliableAcknowledge + 1; i <= clc.reliableSequence; i++) {
		msg.writeByte(CLM.clientCommand);
		msg.writeInt(i);
		msg.writeCString(clc.reliableCommands[i % MAX_RELIABLE_COMMANDS]);
	}

	// Write only the latest client command for now
	// since we're rocking TCP.
	var cmd = cl.cmds[cl.cmdNumber % CMD_BACKUP];

	if (!cl.snap || !cl.snap.valid || clc.serverMessageSequence !== cl.snap.messageNum) {
		msg.writeByte(CLM.moveNoDelta);
	} else {
		msg.writeByte(CLM.move);
	}
	msg.writeInt(cmd.serverTime);
	msg.writeUnsignedShort(cmd.angles[0]);
	msg.writeUnsignedShort(cmd.angles[1]);
	msg.writeUnsignedShort(cmd.angles[2]);
	msg.writeByte(cmd.forwardmove);
	msg.writeByte(cmd.rightmove);
	msg.writeByte(cmd.upmove);
	msg.writeByte(cmd.buttons);
	msg.writeByte(cmd.weapon);
	msg.writeByte(CLM.EOF);

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

	var cmd = msg.readByte();

	if (cmd === SVM.serverCommand) {
		ParseCommandString(msg);
	} else if (cmd === SVM.gamestate) {
		ParseGameState(msg);
	} else if (cmd === SVM.snapshot) {
		ParseSnapshot(msg);
	} else {
		com.error(Err.DROP, 'Bad message type', cmd);
	}
}

/**
 * ParseCommandString
 */
function ParseCommandString(msg) {
	var seq = msg.readInt();
	var type = msg.readCString();
	var value = JSON.parse(msg.readCString());

	// See if we have already executed stored it off.
	if (clc.serverCommandSequence >= seq) {
		return;
	}
	clc.serverCommandSequence = seq;

	var index = seq % MAX_RELIABLE_COMMANDS;
	clc.serverCommands[index] = { type: type, value: value };

	console.log('ParseCommandString', clc.serverCommands[index]);
}

/**
 * ParseGameState
 */
function ParseGameState(msg) {
	var nullstate = new sh.EntityState();
	
	// Wipe local client state.
	cl = new ClientLocals();

	// A gamestate always marks a server command sequence.
	clc.serverCommandSequence = msg.readInt();

	log('Parsing game state', clc.serverCommandSequence);

	while (true) {
		var cmd = msg.readByte();

		if (cmd === SVM.EOF) {
			break;
		}
		
		if (cmd === SVM.configstring) {
			var json = JSON.parse(msg.readCString());
			cl.gameState[json.k] = json.v;
		} else if (cmd === SVM.baseline) {
			var newnum = msg.readShort(); /* GENTITYNUM_BITS */
			if (newnum < 0 || newnum >= MAX_GENTITIES) {
				com.error(Err.DROP, 'Baseline number out of range:', newnum);
			}
			var es = cl.entityBaselines[newnum];
			sh.ReadDeltaEntityState(msg, nullstate, es, newnum);
		} else {
			com.error(sh.Err.DROP, 'ParseGamestate: bad command byte');
		}
	}

	clc.clientNum = msg.readInt();

	SystemInfoChanged();
	ServerInfoChanged();

	// Let the client game init and load data.
	InitSubsystems();
	InitCGame();
}

/**
 * SystemInfoChanged
 *
 * The systeminfo configstring has been changed, so parse
 * new information out of it.  This will happen at every
 * gamestate, and possibly during gameplay.
 */
function SystemInfoChanged() {
	var systemInfo = cl.gameState['systemInfo'];

	cl.serverId = systemInfo['sv_serverid'];

// 	// scan through all the variables in the systeminfo and locally set cvars to match
// 	s = systemInfo;
// 	while ( s ) {
// 		int cvar_flags;
		
// 		Info_NextPair( &s, key, value );
// 		if ( !key[0] ) {
// 			break;
// 		}
		
// 		// ehw!
// 		if (!Q_stricmp(key, "fs_game"))
// 		{
// 			if(FS_CheckDirTraversal(value))
// 			{
// 				Com_Printf(S_COLOR_YELLOW "WARNING: Server sent invalid fs_game value %s\n", value);
// 				continue;
// 			}
				
// 			gameSet = qtrue;
// 		}

// 		if((cvar_flags = Cvar_Flags(key)) == CVAR_NONEXISTENT)
// 			Cvar_Get(key, value, CVAR_SERVER_CREATED | CVAR_ROM);
// 		else
// 		{
// 			// If this cvar may not be modified by a server discard the value.
// 			if(!(cvar_flags & (CVAR_SYSTEMINFO | CVAR_SERVER_CREATED | CVAR_USER_CREATED)))
// 			{
// #ifndef STANDALONE
// 				if(Q_stricmp(key, "g_synchronousClients") && Q_stricmp(key, "pmove_fixed") &&
// 				   Q_stricmp(key, "pmove_msec"))
// #endif
// 				{
// 					Com_Printf(S_COLOR_YELLOW "WARNING: server is not allowed to set %s=%s\n", key, value);
// 					continue;
// 				}
// 			}

// 			Cvar_SetSafe(key, value);
// 		}
// 	}
// 	// if game folder should not be set and it is set at the client side
// 	if ( !gameSet && *Cvar_VariableString("fs_game") ) {
// 		Cvar_Set( "fs_game", "" );
// 	}
// 	cl_connectedToPureServer = Cvar_VariableValue( "sv_pure" );
}

/**
 * ServerInfoChanged
 */
function ServerInfoChanged() {
	var serverInfo = cl.gameState['serverInfo'];

	cl.mapname = serverInfo['sv_mapname'];
}

/**
 * ParseSnapshot
 */
function ParseSnapshot(msg) {
	// TODO Add a clone func to ClientSnapshot(), quit allocating.
	var newSnap = new ClientSnapshot();

	// We will have read any new server commands in this
	// message before we got to svc_snapshot.
	newSnap.messageNum = clc.serverMessageSequence;
	newSnap.serverCommandNum = clc.serverCommandSequence;

	// TODO should be replaced by the code below
	newSnap.serverTime = msg.readInt();

	var deltaNum = msg.readByte();
	if (!deltaNum) {
		newSnap.deltaNum = -1;
	} else {
		newSnap.deltaNum = newSnap.messageNum - deltaNum;
	}

	newSnap.snapFlags = msg.readInt();

	// If the frame is delta compressed from data that we
	// no longer have available, we must suck up the rest of
	// the frame, but not use it, then ask for a non-compressed
	// message 
	var old;

	if (newSnap.deltaNum <= 0) {
		newSnap.valid = true; // uncompressed frame
	} else {
		old = cl.snapshots[newSnap.deltaNum % PACKET_BACKUP];
		if (!old.valid) {
			// Should never happen.
			log('Delta from invalid frame (not supposed to happen!).');
		} else if (old.messageNum !== newSnap.deltaNum) {
			// The frame that the server did the delta from
			// is too old, so we can't reconstruct it properly.
			log('Delta frame too old.');
		} else if (cl.parseEntitiesNum - old.parseEntitiesNum > MAX_PARSE_ENTITIES-128) {
			log('Delta parseEntitiesNum too old.');
		} else {
			newSnap.valid = true; // valid delta parse
		}
	}

	// Read areamask.
	// newSnap.areamask = snapshot.areamask;

	// Read playerinfo.
	if (old) {
		sh.ReadDeltaPlayerState(msg, old.ps, newSnap.ps);
	} else {
		sh.ReadDeltaPlayerState(msg, old, newSnap.ps);
	}

	// Read packet entities.
	ParsePacketEntities(msg, old, newSnap);

	// If not valid, dump the entire thing now that it has
	// been properly read.
	if (!newSnap.valid) {
		return;
	}

	// Clear the valid flags of any snapshots between the last
	// received and this one, so if there was a dropped packet
	// it won't look like something valid to delta from next
	// time we wrap around in the buffer.
	var oldMessageNum = cl.snap.messageNum + 1;

	if (newSnap.messageNum - oldMessageNum >= PACKET_BACKUP) {
		oldMessageNum = newSnap.messageNum - ( PACKET_BACKUP - 1 );
	}
	for ( ; oldMessageNum < newSnap.messageNum ; oldMessageNum++ ) {
		cl.snapshots[oldMessageNum % PACKET_BACKUP].valid = false;
	}
	
	// Copy to the current good spot.
	cl.snap = newSnap;

	/*cl.snap.ping = 999;
	// Calculate ping time.
	for (var i = 0 ; i < PACKET_BACKUP ; i++ ) {
		packetNum = (clc.netchan.outgoingSequence - 1 - i) % PACKET_BACKUP;
		if (cl.snap.ps.commandTime >= cl.outPackets[packetNum].p_serverTime) {
			cl.snap.ping = cls.realtime - cl.outPackets[packetNum].p_realtime;
			break;
		}
	}*/

	// Save the frame off in the backup array for later delta comparisons.
	cl.snapshots[cl.snap.messageNum % PACKET_BACKUP] = cl.snap;

	cl.newSnapshots = true;
}

/**
 * ParsePacketEntities
 */
function ParsePacketEntities(msg, oldframe, newframe) {	
	var newnum;
	var oldstate;
	var oldindex, newindex;

	newframe.parseEntitiesNum = cl.parseEntitiesNum;
	newframe.numEntities = 0;

	// Delta from the entities present in oldframe.
	oldindex = 0;
	oldstate = null;
	if (!oldframe) {
		oldnum = 99999;
	} else {
		if (oldindex >= oldframe.numEntities) {
			oldnum = 99999;
		} else {
			oldstate = cl.parseEntities[(oldframe.parseEntitiesNum + oldindex) % MAX_PARSE_ENTITIES];
			oldnum = oldstate.number;
		}
	}

	while (true) {
		var newnum = msg.readShort();

		if (newnum === (MAX_GENTITIES-1)) {
			break;
		}
	
		while (oldnum < newnum) {
			// One or more entities from the old packet are unchanged.
			DeltaEntity(msg, newframe, oldnum, oldstate, true);
			
			oldindex++;

			if (oldindex >= oldframe.numEntities) {
				oldnum = 99999;
			} else {
				oldstate = cl.parseEntities[(oldframe.parseEntitiesNum + oldindex) % MAX_PARSE_ENTITIES];
				oldnum = oldstate.number;
			}
		}

		if (oldnum === newnum) {
			// Delta from previous state.
			DeltaEntity(msg, newframe, newnum, oldstate, false);

			oldindex++;

			if (oldindex >= oldframe.numEntities) {
				oldnum = 99999;
			} else {
				oldstate = cl.parseEntities[(oldframe.parseEntitiesNum + oldindex) % MAX_PARSE_ENTITIES];
				oldnum = oldstate.number;
			}
			continue;
		}

		if (oldnum > newnum) {
			// Delta from baseline.
			DeltaEntity(msg, newframe, newnum, cl.entityBaselines[newnum], false);
			continue;
		}
	}

	// Any remaining entities in the old frame are copied over.
	while (oldnum !== 99999) {
		// One or more entities from the old packet are unchanged.
		DeltaEntity(msg, newframe, oldnum, oldstate, true);
		
		oldindex++;

		if (oldindex >= oldframe.numEntities) {
			oldnum = 99999;
		} else {
			oldstate = cl.parseEntities[(oldframe.parseEntitiesNum + oldindex) % MAX_PARSE_ENTITIES];
			oldnum = oldstate.number;
		}
	}
}

/**
 * DeltaEntity
 *
 * Parses deltas from the given base and adds the resulting entity
 * to the current frame.
 */
function DeltaEntity(msg, newframe, newnum, oldstate, unchanged) {
	// Save the parsed entity state into the big circular buffer so
	// it can be used as the source for a later delta.
	var newstate = cl.parseEntities[cl.parseEntitiesNum % MAX_PARSE_ENTITIES];

	if (unchanged ) {
		oldstate.clone(newstate);
	} else {
		sh.ReadDeltaEntityState(msg, oldstate, newstate, newnum);
	}

	if (newstate.number === (MAX_GENTITIES-1)) {
		return;  // entity was delta removed
	}

	cl.parseEntitiesNum++;
	newframe.numEntities++;
}