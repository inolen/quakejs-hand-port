/**
 * BuildClientSnapshot
 * 
 * Decides which entities are going to be visible to the client, and
 * copies off the playerstate and areabits.
 */
function BuildClientSnapshot(client, msg) {
	var clent = client.gentity;
	if (!clent || client.state === ClientState.ZOMBIE) {
		return false; // Client hasn't entered world yet.
	}

	// Bump the counter used to prevent double adding.
	sv.snapshotCounter++;

	var frame = client.frames[client.netchan.outgoingSequence % PACKET_BACKUP];
	var clientNum = GetClientNum(client);
	frame.ps = gm.GetClientPlayerstate(clientNum);

	// Never send client's own entity, because it can
	// be regenerated from the playerstate.
	var clientNum = frame.ps.clientNum;
	var svEnt = sv.svEntities[clientNum];
	svEnt.snapshotCounter = sv.snapshotCounter;

	var entityNumbers = [];
	AddEntitiesVisibleFromPoint(frame.ps.origin, frame, entityNumbers, false);

	frame.numEntities = 0;
	frame.firstEntity = svs.nextSnapshotEntities;

	// Copy the entity states out.
	for (var i = 0 ; i < entityNumbers.length; i++) {
		var ent = GentityForNum(entityNumbers[i]);
		var state = svs.snapshotEntities[svs.nextSnapshotEntities % MAX_SNAPSHOT_ENTITIES];

		ent.s.clone(state);
		svs.nextSnapshotEntities++;
		frame.numEntities++;
	}

	return true;
}

/**
 * AddEntitiesVisibleFromPoint
 */
function AddEntitiesVisibleFromPoint(origin, frame, eNums, portal) {
	/*leafnum = cm.PointLeafnum (origin);
	clientarea = cm.LeafArea (leafnum);
	clientcluster = cm.LeafCluster (leafnum);

	// calculate the visible areas
	frame->areabytes =cm.WriteAreaBits( frame->areabits, clientarea );

	clientpvs = cm.ClusterPVS (clientcluster);*/

	for (var i = 0; i < MAX_GENTITIES; i++) {
		var ent = GentityForNum(i);

		// Never send entities that aren't linked in.
		if (!ent || !ent.linked) {
			continue;
		}

		if (ent.s.number !== i) {
			com.error(sh.Err.DROP, 'Entity number does not match.. WTF');
			/*log('FIXING ENT->S.NUMBER!!!');
			ent.s.number = e;*/
		}

		// Entities can be flagged to explicitly not be sent to the client.
		if (ent.svFlags & ServerFlags.NOCLIENT) {
			continue;
		}

		// Entities can be flagged to be sent to only one client.
		if (ent.svFlags & ServerFlags.SINGLECLIENT) {
			if (ent.singleClient != frame.ps.clientNum) {
				continue;
			}
		}
		// Entities can be flagged to be sent to everyone but one client.
		if (ent.svFlags & ServerFlags.NOTSINGLECLIENT) {
			if (ent.singleClient === frame.ps.clientNum) {
				continue;
			}
		}

		var svEnt = SvEntityForGentity(ent);

		// Don't double add an entity through portals.
		if (svEnt.snapshotCounter === sv.snapshotCounter) {
			continue;
		}

		// Broadcast entities are always sent.
		if (ent.svFlags & ServerFlags.BROADCAST) {
			AddEntToSnapshot(svEnt, ent, eNums);
			continue;
		}

		// // Ignore if not touching a PV leaf.
		// // Check area.
		// if ( !CM_AreasConnected( clientarea, svEnt->areanum ) ) {
		// 	// doors can legally straddle two areas, so
		// 	// we may need to check another one
		// 	if ( !CM_AreasConnected( clientarea, svEnt->areanum2 ) ) {
		// 		continue;		// blocked by a door
		// 	}
		// }

		// bitvector = clientpvs;

		// // Check individual leafs.
		// if ( !svEnt->numClusters ) {
		// 	continue;
		// }
		// l = 0;
		// for ( i=0 ; i < svEnt->numClusters ; i++ ) {
		// 	l = svEnt->clusternums[i];
		// 	if ( bitvector[l >> 3] & (1 << (l&7) ) ) {
		// 		break;
		// 	}
		// }

		// // If we haven't found it to be visible,
		// // check overflow clusters that coudln't be stored.
		// if ( i == svEnt->numClusters ) {
		// 	if ( svEnt->lastCluster ) {
		// 		for ( ; l <= svEnt->lastCluster ; l++ ) {
		// 			if ( bitvector[l >> 3] & (1 << (l&7) ) ) {
		// 				break;
		// 			}
		// 		}
		// 		if ( l == svEnt->lastCluster ) {
		// 			continue;	// not visible
		// 		}
		// 	} else {
		// 		continue;
		// 	}
		// }

		// Add it.
		AddEntToSnapshot(svEnt, ent, eNums);

		// // If it's a portal entity, add everything visible from its camera position.
		// if (ent.r.svFlags & SVF_PORTAL) {
		// 	if (ent.s.generic1) {
		// 		var dir = vec3.subtract(ent.s.origin, origin, [0, 0, 0]);

		// 		if (VectorLengthSquared(dir) > (float) ent->s.generic1 * ent->s.generic1) {
		// 			continue;
		// 		}
		// 	}
			
		// 	AddEntitiesVisibleFromPoint( ent->s.origin2, frame, eNums, qtrue );
		// }
	}
}

/**
 * AddEntToSnapshot
 */
function AddEntToSnapshot(svEnt, gEnt, eNums) {
	// If we have already added this entity to this snapshot, don't add again.
	if (svEnt.snapshotCounter === sv.snapshotCounter) {
		return;
	}

	svEnt.snapshotCounter = sv.snapshotCounter;

	eNums.push(gEnt.s.number);
}

/**
 * SendClientSnapshot
 */
function SendClientSnapshot(client) {
	if (!BuildClientSnapshot(client)) {
		return;
	}

	var frame = client.frames[client.netchan.outgoingSequence % PACKET_BACKUP];
	var msg = new ByteBuffer(svs.msgBuffer, ByteBuffer.LITTLE_ENDIAN);

	msg.writeInt(client.lastClientCommand);

	msg.writeUnsignedByte(SVM.snapshot);

	// Send over the current server time so the client can drift
	// its view of time to try to match.
	var serverTime = sv.time;
	if (client.oldServerTime) {
		// The server has not yet got an acknowledgement of the
		// new gamestate from this client, so continue to send it
		// a time as if the server has not restarted. Note from
		// the client's perspective this time is strictly speaking
		// incorrect, but since it'll be busy loading a map at
		// the time it doesn't really matter.
		serverTime = sv.time + client.oldServerTime;
	}
	msg.writeInt(serverTime);

	var snapFlags = svs.snapFlagServerBit;
	if (client.state !== ClientState.ACTIVE) {
		snapFlags |= SNAPFLAG_NOT_ACTIVE;
	}
	msg.writeInt(snapFlags);

	// Write out playerstate
	sh.WriteDeltaPlayerState(msg, frame.ps);

	// Should not write an int, and instead write a bitstream of GENTITYNUM_BITS length.
	for (var i = 0; i < frame.numEntities; i++) {
		var state = svs.snapshotEntities[(frame.firstEntity+i) % MAX_SNAPSHOT_ENTITIES];

		msg.writeInt(state.number);
		sh.WriteDeltaEntityState(msg, state);
	}

	msg.writeUnsignedInt(MAX_GENTITIES-1);

	com.NetchanSend(client.netchan, msg.buffer, msg.index);
}

/**
 * SendClientMessages
 */
function SendClientMessages() {
	for (var i = 0; i < svs.clients.length; i++) {
		var client = svs.clients[i];

		if (!client) {
			continue;
		}
		
		if (!client.state) {
			continue; // not connected
		}

		if (svs.time - client.lastSnapshotTime < client.snapshotMsec) {
			continue; // it's not time yet
		}

		SendClientSnapshot(client);
		client.lastSnapshotTime = svs.time;
	}
}