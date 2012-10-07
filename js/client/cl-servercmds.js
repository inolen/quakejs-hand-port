function ExecuteServerMessage(msg) {
	clc.serverMessageSequence = msg.serverMessageSequence;

	if (msg.type === Net.ServerOp.Type.gamestate) {
		ParseGameState(msg.svop_gamestate);
	} else if (msg.type === Net.ServerOp.Type.snapshot) {
		ParseSnapshot(msg.svop_snapshot);
	}
}

function ParseGameState(msg) {
	// Wipe local client state.
	ClearState();

	for (var i = 0; i < msg.configstrings.length; i++) {
		var cs = msg.configstrings[i];
		cl.gameState[cs.key] = cs.value;
	}

	// Let the client game init and load data.
	InitCGame();
}

function ParseSnapshot(msg) {
	var newSnap = cl.snapshots[clc.serverMessageSequence & PACKET_MASK];

	// We will have read any new server commands in this
	// message before we got to svc_snapshot.
	//newSnap.serverCommandNum = clc.serverCommandSequence;
	newSnap.messageNum = clc.serverMessageSequence;

	// TODO should be replaced by the code below
	newSnap.serverTime = msg.serverTime;
	newSnap.snapFlags = msg.snapFlags;
	newSnap.valid = true;

	//console.log('ParseSnapshot', msg.serverTime);

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

	cl.newSnapshots = true;
}

function ParsePacketPlayerstate(msg, snap) {
	if (msg.ps.origin.length) {
		vec3.set(msg.ps.origin, snap.ps.origin);
	}
	if (msg.ps.velocity.length) {
		vec3.set(msg.ps.velocity, snap.ps.velocity);
	}
	if (msg.ps.viewangles.length) {
		vec3.set(msg.ps.viewangles, snap.ps.viewangles);
	}
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

		if (typeof state.number !== 'undefined') {
			parseState.number = state.number;
		}
		if (typeof state.eType !== 'undefined') {
			parseState.eType = state.eType;
		}
		if (typeof state.eFlags !== 'undefined') {
			parseState.eFlags = state.eFlags;
		}
		if (typeof state.tyme !== 'undefined') {
			parseState.time = state.tyme;
		}
		if (typeof state.tyme2 !== 'undefined') {
			parseState.time2 = state.tyme2;
		}
		if (typeof state.origin !== 'undefined') {
			parseState.origin = state.origin;
		}
		if (typeof state.origin2 !== 'undefined') {
			parseState.origin2 = state.origin2;
		}
		if (typeof state.angles !== 'undefined') {
			parseState.angles = state.angles;
		}
		if (typeof state.angles2 !== 'undefined') {
			parseState.angles2 = state.angles2;
		}
		if (typeof state.groundEntityNum !== 'undefined') {
			parseState.groundEntityNum = state.groundEntityNum;
		}
		if (typeof state.clientNum !== 'undefined') {
			parseState.clientNum = state.clientNum;
		}
		if (typeof state.frame !== 'undefined') {
			parseState.frame = state.frame;
		}

		cl.parseEntitiesNum++;
		snap.numEntities++;
	}
}