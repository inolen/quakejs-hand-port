function ExecuteServerMessage(msg) {
	var messageSequence = msg.readUnsignedInt();
	var type = msg.readUnsignedByte();

	clc.serverMessageSequence = messageSequence;

	if (type === ServerMessage.gamestate) {
		ParseGameState(msg);
	} else if (type === ServerMessage.snapshot) {
		ParseSnapshot(msg);
	}
}

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

	// Let the client game init and load data.
	InitCGame();
}

function ParseSnapshot(msg) {
	var newSnap = new ClientSnapshot();

	// We will have read any new server commands in this
	// message before we got to svc_snapshot.
	//newSnap.serverCommandNum = clc.serverCommandSequence;
	newSnap.messageNum = clc.serverMessageSequence;

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
		old = cl.snapshots[newSnap.deltaNum & PACKET_MASK];
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
	//ParsePacketEntities(msg,/* old, */newSnap);

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
		cl.snapshots[oldMessageNum & PACKET_MASK].valid = false;
	}*/
	
	// copy to the current good spot
	cl.snap = newSnap;

	/*cl.snap.ping = 999;
	// calculate ping time
	for (var i = 0 ; i < PACKET_BACKUP ; i++ ) {
		packetNum = (clc.netchan.outgoingSequence - 1 - i) & PACKET_MASK;
		if (cl.snap.ps.commandTime >= cl.outPackets[packetNum].p_serverTime) {
			cl.snap.ping = cls.realtime - cl.outPackets[packetNum].p_realtime;
			break;
		}
	}*/

	// save the frame off in the backup array for later delta comparisons
	cl.snapshots[cl.snap.messageNum & PACKET_MASK] = cl.snap;

	cl.newSnapshots = true;
}

function ParsePacketPlayerstate(msg, snap) {
	snap.ps.commandTime = msg.readUnsignedInt();
	snap.ps.pm_type = msg.readUnsignedInt();
	snap.ps.pm_flags = msg.readUnsignedInt();
	snap.ps.pm_time = msg.readUnsignedInt();
	snap.ps.gravity = msg.readUnsignedInt();
	snap.ps.speed = msg.readUnsignedInt();
	snap.ps.origin[0] = msg.readFloat();
	snap.ps.origin[1] = msg.readFloat();
	snap.ps.origin[2] = msg.readFloat();
	snap.ps.velocity[0] = msg.readFloat();
	snap.ps.velocity[1] = msg.readFloat();
	snap.ps.velocity[2] = msg.readFloat();
	snap.ps.viewangles[0] = msg.readFloat();
	snap.ps.viewangles[1] = msg.readFloat();
	snap.ps.viewangles[2] = msg.readFloat();
}

function ParsePacketEntities(msg, snap) {	
	snap.parseEntitiesNum = cl.parseEntitiesNum;

	for (var i = 0; i < msg.es.length; i++) {
		// Save the parsed entity state into the big circular buffer so
		// it can be used as the source for a later delta
		var state = msg.es[i];
		var parseState = cl.parseEntities[cl.parseEntitiesNum & (MAX_PARSE_ENTITIES-1)];

		/*if ( unchanged ) {
			*state = *old;
		} else {
			MSG_ReadDeltaEntity( msg, old, state, newnum );
		}

		if ( state->number == (MAX_GENTITIES-1) ) {
			return;		// entity was delta removed
		}*/

		parseState.number = state.number;
		parseState.eType = state.eType;
		parseState.eFlags = state.eFlags;
		parseState.time = state.tyme;
		parseState.time2 = state.tyme2;
		vec3.set(state.origin, parseState.origin);
		vec3.set(state.origin2, parseState.origin2);
		vec3.set(state.angles, parseState.angles);
		vec3.set(state.angles2, parseState.angles2);
		parseState.groundEntityNum = state.groundEntityNum;
		parseState.clientNum = state.clientNum;
		parseState.frame = state.frame;

		cl.parseEntitiesNum++;
		snap.numEntities++;
	}
}