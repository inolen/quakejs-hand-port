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
	// figure button bits
	// send a button bit even if the key was pressed and released in
	// less than a frame
	for (var i = 0; i < 15 ; i++) {
		var btn = cls.inButtons[i];

		if (!btn) {
			continue;
		}

		if (btn.active || btn.wasPressed ) {
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

	cmd.forwardmove = qm.ClampChar(forward);
	cmd.rightmove = qm.ClampChar(side);
	cmd.upmove = up;
}

/**
 * MouseMove
 */
function MouseMove(cmd) {
	var oldAngles = vec3.create(cl.viewangles);
	var mx = cl.mouseX * cl_sensitivity();
	var my = cl.mouseY * cl_sensitivity();

	cl.viewangles[qm.YAW] -= mx * 0.022;
	cl.viewangles[qm.PITCH] += my * 0.022;

	if (cl.viewangles[qm.PITCH] - oldAngles[qm.PITCH] > 90) {
		cl.viewangles[qm.PITCH] = oldAngles[qm.PITCH] + 90;
	} else if (oldAngles[qm.PITCH] - cl.viewangles[qm.PITCH] > 90) {
		cl.viewangles[qm.PITCH] = oldAngles[qm.PITCH] - 90;
	}

	// reset
	cl.mouseX = 0;
	cl.mouseY = 0;

	cmd.angles[0] = qm.AngleToShort(cl.viewangles[0]);
	cmd.angles[1] = qm.AngleToShort(cl.viewangles[1]);
	cmd.angles[2] = qm.AngleToShort(cl.viewangles[2]);
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

	msg.writeByte(CLM.moveNoDelta);
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

	if (cmd === SVM.gamestate) {
		ParseGameState(msg);
	} else if (cmd === SVM.snapshot) {
		ParseSnapshot(msg);
	}
}

/**
 * ParseGameState
 */
function ParseGameState(msg) {
	log('Parsing game state');
	
	// Wipe local client state.
	cl = new ClientLocals();

	while (true) {
		var cmd = msg.readByte();

		if (cmd === SVM.EOF) {
			break;
		}
		
		if (cmd === SVM.configstring) {
			var key = msg.readCString();
			var val = msg.readCString();

			cl.gameState[key] = JSON.parse(val);
		}/* else if ( cmd == svc_baseline ) {
			newnum = MSG_ReadBits( msg, GENTITYNUM_BITS );
			if ( newnum < 0 || newnum >= MAX_GENTITIES ) {
				Com_Error( ERR_DROP, "Baseline number out of range: %i", newnum );
			}
			Com_Memset (&nullstate, 0, sizeof(nullstate));
			es = &cl.entityBaselines[ newnum ];
			MSG_ReadDeltaEntity( msg, &nullstate, es, newnum );
		}*/ else {
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
			log('Delta from invalid frame (not supposed to happen!).');
		} else if (old.messageNum != newSnap.deltaNum) {
			// The frame that the server did the delta from
			// is too old, so we can't reconstruct it properly.
			log('Delta frame too old.');
		} else if (cl.parseEntitiesNum - old.parseEntitiesNum > MAX_PARSE_ENTITIES-128) {
			log('Delta parseEntitiesNum too old.');
		} else {
			newSnap.valid = true;	// valid delta parse
		}
	}

	// Read areamask.
	newSnap.areamask = snapshot.areamask;*/

	// Read playerinfo.
	/*if (old) {
		MSG_ReadDeltaPlayerstate( msg, &old->ps, &newSnap.ps );
	} else {
		MSG_ReadDeltaPlayerstate( msg, NULL, &newSnap.ps );
	}*/
	ParsePacketPlayerstate(msg, newSnap);

	// Read packet entities.
	ParsePacketEntities(msg,/* old, */newSnap);

	// If not valid, dump the entire thing now that it has
	// been properly read.
	/*if (!newSnap.valid) {
		return;
	}*/

	// Clear the valid flags of any snapshots between the last
	// received and this one, so if there was a dropped packet
	// it won't look like something valid to delta from next
	// time we wrap around in the buffer.
	/*var oldMessageNum = cl.snap.messageNum + 1;

	if (newSnap.messageNum - oldMessageNum >= PACKET_BACKUP) {
		oldMessageNum = newSnap.messageNum - ( PACKET_BACKUP - 1 );
	}
	for ( ; oldMessageNum < newSnap.messageNum ; oldMessageNum++ ) {
		cl.snapshots[oldMessageNum % PACKET_BACKUP].valid = false;
	}*/
	
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
	snap.ps.speed = msg.readInt();
	snap.ps.gravity = msg.readInt();
	snap.ps.groundEntityNum = msg.readInt();
	snap.ps.bobCycle = msg.readInt();
	snap.ps.weapon = msg.readInt();
	snap.ps.weaponState = msg.readInt();
	snap.ps.weaponTime = msg.readInt();
	snap.ps.legsTimer = msg.readInt();
	snap.ps.legsAnim = msg.readShort();
	snap.ps.torsoTimer = msg.readInt();
	snap.ps.torsoAnim = msg.readShort();
	snap.ps.movementDir = msg.readByte();
	for (var i = 0; i < MAX_STATS; i++) {
		snap.ps.stats[i] = msg.readInt();
	}
	for (var i = 0; i < MAX_PERSISTANT; i++) {
		snap.ps.persistant[i] = msg.readInt();
	}
	for (var i = 0; i < MAX_POWERUPS; i++) {
		snap.ps.powerups[i] = msg.readInt();
	}
	for (var i = 0; i < MAX_WEAPONS; i++) {
		snap.ps.ammo[i] = msg.readInt();
	}
	snap.ps.eventSequence = msg.readInt();
	for (var i = 0; i < MAX_PS_EVENTS; i++) {
		snap.ps.events[i] = msg.readInt();
	}	
	for (var i = 0; i < MAX_PS_EVENTS; i++) {
		snap.ps.eventParms[i] = msg.readInt();
	}
	snap.ps.externalEvent = msg.readInt();
	snap.ps.externalEventParm = msg.readInt();
	snap.ps.externalEventTime = msg.readInt();
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
		var state = cl.parseEntities[cl.parseEntitiesNum % MAX_PARSE_ENTITIES];

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
		state.modelIndex2 = msg.readInt();
		state.solid = msg.readInt();
		state.clientNum = msg.readInt();
		state.frame = msg.readInt();
		state.solid = msg.readInt();
		state.event = msg.readInt();
		state.eventParm = msg.readInt();
		state.weapon = msg.readShort();
		state.legsAnim = msg.readShort();
		state.torsoAnim = msg.readShort();

		cl.parseEntitiesNum++;
		snap.numEntities++;
	}
}