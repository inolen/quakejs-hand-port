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
	cl.cmds[cl.cmdNumber % QS.CMD_BACKUP] = CreateCommand();
}

/**
 * CreateCommand
 */
function CreateCommand() {
	var cmd = new QS.UserCmd();

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
	var forward = 0;
	var right = 0;
	var up = 0;

	// adjust for speed key / running
	// the walking flag is to keep animations consistant
	// even during acceleration and develeration
	// if ( in_speed.active ^ cl_run->integer ) {
		movespeed = 127;
	// 	cmd.buttons &= ~BUTTON.WALKING;
	// } else {
	// 	cmd->buttons |= QS.BUTTON_WALKING;
	// 	movespeed = 64;
	// }

	if (cls.inForward) forward += movespeed * GetKeyState(cls.inForward);
	if (cls.inBack) forward -= movespeed * GetKeyState(cls.inBack);

	if (cls.inRight) right += movespeed * GetKeyState(cls.inRight);
	if (cls.inLeft) right -= movespeed * GetKeyState(cls.inLeft);

	if (cls.inUp) { up += movespeed * GetKeyState(cls.inUp); }
	// TODO Add crouching.
	//if (cls.inDown) up -= movespeed * GetKeyState(cls.inDown);

	cmd.forwardmove = Math.max(-127, Math.min(forward, 127));
	cmd.rightmove = Math.max(-127, Math.min(right, 127));
	cmd.upmove = Math.max(-127, Math.min(up, 127));
}

/**
 * MouseMove
 */
function MouseMove(cmd) {
	var oldAngles = vec3.create(cl.viewangles);

	var mx = (cl.mouseX[0] + cl.mouseX[1]) * 0.5;
	var my = (cl.mouseY[0] + cl.mouseY[1]) * 0.5;

	cl.mouseIndex ^= 1;
	cl.mouseX[cl.mouseIndex] = 0;
	cl.mouseY[cl.mouseIndex] = 0;

	// if (mx === 0.0 && my === 0.0) {
	// 	return;
	// }

	// Adjust user sensitivity.
	mx *= cl_sensitivity();
	my *= cl_sensitivity();

	// Ingame FOV.
	mx *= cl.cgameSensitivity;
	my *= cl.cgameSensitivity;

	cl.viewangles[QMath.YAW] -= mx * 0.022;
	cl.viewangles[QMath.PITCH] += my * 0.022;

	if (cl.viewangles[QMath.PITCH] - oldAngles[QMath.PITCH] > 90) {
		cl.viewangles[QMath.PITCH] = oldAngles[QMath.PITCH] + 90;
	} else if (oldAngles[QMath.PITCH] - cl.viewangles[QMath.PITCH] > 90) {
		cl.viewangles[QMath.PITCH] = oldAngles[QMath.PITCH] - 90;
	}

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
var msgBuffer = new ArrayBuffer(COM.MAX_MSGLEN);
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
		var cmd = clc.reliableCommands[i % COM.MAX_RELIABLE_COMMANDS];

		msg.writeByte(COM.CLM.clientCommand);
		msg.writeInt(i);
		msg.writeCString(JSON.stringify(cmd));
	}

	// Since we're on TCP/IP for now, there is no need to send
	// duplicate usercmd packets, however we're leaving the code in
	// in order to swap out later.
	var cmd;
	var oldcmd;
	var oldPacketNum = (clc.netchan.outgoingSequence - 1/* - cl_packetdup->integer*/) % COM.PACKET_BACKUP;
	var count = cl.cmdNumber - cl.outPackets[oldPacketNum].cmdNumber;

	// Sanity check.. disable for UDP.
	if (count > 1) {
		COM.error('Invalid cmd number.');
		return;
	}

	if (count >= 1) {
		if (!cl.snap || !cl.snap.valid || clc.serverMessageSequence !== cl.snap.messageNum) {
			msg.writeByte(COM.CLM.moveNoDelta);
		} else {
			msg.writeByte(COM.CLM.move);
		}

		// Write the command count.
		msg.writeByte(count);

		// Write all the commands, including the predicted command.
		for (var i = 0; i < count; i++) {
			var j = (cl.cmdNumber - count + i + 1) % QS.CMD_BACKUP;
			var cmd = cl.cmds[j];
			COM.WriteDeltaUsercmd(msg, oldcmd, cmd);
			oldcmd = cmd;
		}
	}

	msg.writeByte(COM.CLM.EOF);

	// Used by ping calculations.
	var packetNum = clc.netchan.outgoingSequence % COM.PACKET_BACKUP;
	cl.outPackets[packetNum].realTime = cls.realTime;
	cl.outPackets[packetNum].serverTime = oldcmd ? oldcmd.serverTime : 0;
	cl.outPackets[packetNum].cmdNumber = cl.cmdNumber;

	COM.NetchanSend(clc.netchan, msg.buffer, msg.index);
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
	if (clc.reliableAcknowledge < clc.reliableSequence - COM.MAX_RELIABLE_COMMANDS) {
		clc.reliableAcknowledge = clc.reliableSequence;
	}

	while (true) {
		var cmd = msg.readByte();

		if (cmd === COM.SVM.EOF) {
			break;
		}

		if (cmd === COM.SVM.serverCommand) {
			ParseServerCommand(msg);
		} else if (cmd === COM.SVM.gamestate) {
			ParseGameState(msg);
		} else if (cmd === COM.SVM.snapshot) {
			ParseSnapshot(msg);
		} else {
			COM.Error('Bad message type', cmd);
		}
	}
}

/**
 * ParseServerCommand
 */
function ParseServerCommand(msg) {
	var seq = msg.readInt();
	var cmd = JSON.parse(msg.readCString());

	// See if we have already executed it.
	if (clc.serverCommandSequence >= seq) {
		return;
	}
	clc.serverCommandSequence = seq;

	var index = seq % COM.MAX_RELIABLE_COMMANDS;
	clc.serverCommands[index] = cmd;
}

/**
 * ParseGameState
 */
function ParseGameState(msg) {
	var nullstate = new QS.EntityState();

	// Wipe local client state.
	cl = new ClientLocals();

	// A gamestate always marks a server command sequence.
	clc.serverCommandSequence = msg.readInt();

	log('Parsing game state', clc.serverCommandSequence);

	while (true) {
		var cmd = msg.readByte();

		if (cmd === COM.SVM.EOF) {
			break;
		}

		if (cmd === COM.SVM.configstring) {
			var json = JSON.parse(msg.readCString());
			cl.gameState[json.k] = json.v;
		} else if (cmd === COM.SVM.baseline) {
			var newnum = msg.readShort(); /* GENTITYNUM_BITS */
			if (newnum < 0 || newnum >= QS.MAX_GENTITIES) {
				COM.Error('Baseline number out of range:', newnum);
			}
			var es = cl.entityBaselines[newnum];
			COM.ReadDeltaEntityState(msg, nullstate, es, newnum);
		} else {
			COM.Error('ParseGamestate: bad command byte');
		}
	}

	clc.clientNum = msg.readInt();

	ProcessConfigStrings();

	// Let the client game init and load data.
	InitCGame();
}

/**
 * ProcessConfigStrings
 *
 * Called explicitly in ParseGameState to process all the current config strings.
 */
function ProcessConfigStrings() {
	for (var key in cl.gameState) {
		if (!cl.gameState.hasOwnProperty(key)) {
			continue;
		}

		ConfigStringModified(key, cl.gameState[key]);
	}
}

/**
 * ParseSystemInfo
 *
 * The systeminfo configstring has been changed, so parse
 * new information out of it.  This will happen at every
 * gamestate, and possibly during gameplay.
 */
function ParseSystemInfo() {
	var systemInfo = cl.gameState['systemInfo'];

	cl.serverId = systemInfo['sv_serverid'];

	COM.SetCvarVal('pmove_fixed', systemInfo['pmove_fixed']);
	COM.SetCvarVal('pmove_msec', systemInfo['pmove_msec']);
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
		old = cl.snapshots[newSnap.deltaNum % COM.PACKET_BACKUP];
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
		COM.ReadDeltaPlayerState(msg, old.ps, newSnap.ps);
	} else {
		COM.ReadDeltaPlayerState(msg, old, newSnap.ps);
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

	if (newSnap.messageNum - oldMessageNum >= COM.PACKET_BACKUP) {
		oldMessageNum = newSnap.messageNum - ( COM.PACKET_BACKUP - 1 );
	}
	for (; oldMessageNum < newSnap.messageNum ; oldMessageNum++ ) {
		cl.snapshots[oldMessageNum % COM.PACKET_BACKUP].valid = false;
	}

	// Copy to the current good spot.
	cl.snap = newSnap;

	// Calculate ping time.
	cl.snap.ping = 999;
	for (var i = 0; i < COM.PACKET_BACKUP; i++) {
		var packetNum = (clc.netchan.outgoingSequence - 1 - i) % COM.PACKET_BACKUP;
		if (cl.snap.ps.commandTime >= cl.outPackets[packetNum].serverTime) {
			cl.snap.ping = cls.realTime - cl.outPackets[packetNum].realTime;
			break;
		}
	}

	// Save the frame off in the backup array for later delta comparisons.
	cl.snapshots[cl.snap.messageNum % COM.PACKET_BACKUP] = cl.snap;

	cl.newSnapshots = true;
}

/**
 * ParsePacketEntities
 */
function ParsePacketEntities(msg, oldframe, newframe) {
	var oldnum, newnum;
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

		if (newnum === (QS.MAX_GENTITIES-1)) {
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
		COM.ReadDeltaEntityState(msg, oldstate, newstate, newnum);
	}

	if (newstate.number === (QS.MAX_GENTITIES-1)) {
		return;  // entity was delta removed
	}

	cl.parseEntitiesNum++;
	newframe.numEntities++;
}