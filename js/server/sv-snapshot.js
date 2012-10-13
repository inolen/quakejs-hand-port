/*
=============
BuildClientSnapshot

Decides which entities are going to be visible to the client, and
copies off the playerstate and areabits.
=============
*/
function BuildClientSnapshot(client, msg) {
	var clent = client.gentity;
	if (!clent || client.state === ClientState.ZOMBIE) {
		return false; // Client hasn't entered world yet.
	}

	var frame = client.frames[client.netchan.outgoingSequence & PACKET_MASK];
	var clientNum = GetClientNum(client);
	frame.ps = gm.GetClientPlayerstate(clientNum);
	
	//AddEntitiesVisibleFromPoint(frame.ps.origin, frame, null, false);

	return true;
}

// function AddEntitiesVisibleFromPoint(origin, frame, eNums, portal) {
// 	/*leafnum = cm.PointLeafnum (origin);
// 	clientarea = cm.LeafArea (leafnum);
// 	clientcluster = cm.LeafCluster (leafnum);

// 	// calculate the visible areas
// 	frame->areabytes =cm.WriteAreaBits( frame->areabits, clientarea );

// 	clientpvs = cm.ClusterPVS (clientcluster);*/

// 	for (var e = 0; e < sv.num_entities; e++) {
// 		ent = SV_GentityNum(e);

// 		// never send entities that aren't linked in
// 		if (!ent.r.linked) {
// 			continue;
// 		}

// 		if (ent->s.number != e) {
// 			Com_DPrintf ("FIXING ENT->S.NUMBER!!!\n");
// 			ent->s.number = e;
// 		}

// 		// entities can be flagged to explicitly not be sent to the client
// 		if (ent.r.svFlags & SVF_NOCLIENT) {
// 			continue;
// 		}

// 		// entities can be flagged to be sent to only one client
// 		if (ent.r.svFlags & SVF_SINGLECLIENT) {
// 			if (ent.r.singleClient != frame.ps.clientNum) {
// 				continue;
// 			}
// 		}
// 		// entities can be flagged to be sent to everyone but one client
// 		if (ent.r.svFlags & SVF_NOTSINGLECLIENT) {
// 			if (ent.r.singleClient == frame.ps.clientNum) {
// 				continue;
// 			}
// 		}

// 		svEnt = SvEntityForGentity( ent );

// 		// don't double add an entity through portals
// 		if ( svEnt.snapshotCounter === sv.snapshotCounter ) {
// 			continue;
// 		}

// 		// broadcast entities are always sent
// 		if ( ent.r.svFlags & SVF_BROADCAST ) {
// 			SV_AddEntToSnapshot( svEnt, ent, eNums );
// 			continue;
// 		}

// 		// ignore if not touching a PV leaf
// 		// check area
// 		if ( !CM_AreasConnected( clientarea, svEnt->areanum ) ) {
// 			// doors can legally straddle two areas, so
// 			// we may need to check another one
// 			if ( !CM_AreasConnected( clientarea, svEnt->areanum2 ) ) {
// 				continue;		// blocked by a door
// 			}
// 		}

// 		bitvector = clientpvs;

// 		// check individual leafs
// 		if ( !svEnt->numClusters ) {
// 			continue;
// 		}
// 		l = 0;
// 		for ( i=0 ; i < svEnt->numClusters ; i++ ) {
// 			l = svEnt->clusternums[i];
// 			if ( bitvector[l >> 3] & (1 << (l&7) ) ) {
// 				break;
// 			}
// 		}

// 		// if we haven't found it to be visible,
// 		// check overflow clusters that coudln't be stored
// 		if ( i == svEnt->numClusters ) {
// 			if ( svEnt->lastCluster ) {
// 				for ( ; l <= svEnt->lastCluster ; l++ ) {
// 					if ( bitvector[l >> 3] & (1 << (l&7) ) ) {
// 						break;
// 					}
// 				}
// 				if ( l == svEnt->lastCluster ) {
// 					continue;	// not visible
// 				}
// 			} else {
// 				continue;
// 			}
// 		}

// 		// add it
// 		AddEntToSnapshot(svEnt, ent, eNums);

// 		// if it's a portal entity, add everything visible from its camera position
// 		/*if (ent.r.svFlags & SVF_PORTAL) {
// 			if (ent.s.generic1) {
// 				var dir = vec3.subtract(ent.s.origin, origin, [0, 0, 0]);

// 				if (VectorLengthSquared(dir) > (float) ent->s.generic1 * ent->s.generic1) {
// 					continue;
// 				}
// 			}
			
// 			AddEntitiesVisibleFromPoint( ent->s.origin2, frame, eNums, qtrue );
// 		}*/
// 	}
// }

// function AddEntToSnapshot(svEnt, gEnt, eNums) {
// 	// If we have already added this entity to this snapshot, don't add again.
// 	if (svEnt.snapshotCounter === sv.snapshotCounter) {
// 		return;
// 	}

// 	svEnt.snapshotCounter = sv.snapshotCounter;

// 	// If we are full, silently discard entities.
// 	if (eNums.numSnapshotEntities === MAX_SNAPSHOT_ENTITIES) {
// 		return;
// 	}

// 	eNums.snapshotEntities[eNums.numSnapshotEntities] = gEnt.s.number;
// 	eNums.numSnapshotEntities++;
// }

function SendClientSnapshot(client) {
	if (!BuildClientSnapshot(client)) {
		return;
	}

	var frame = client.frames[client.netchan.outgoingSequence & PACKET_MASK];
	var bb = new ByteBuffer(svs.msgBuffer, ByteBuffer.LITTLE_ENDIAN);

	bb.writeInt(client.netchan.outgoingSequence);
	bb.writeUnsignedByte(ServerMessage.snapshot);

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
	bb.writeUnsignedInt(serverTime);

	var snapFlags = svs.snapFlagServerBit;
	if (client.state !== ClientState.ACTIVE) {
		snapFlags |= SNAPFLAG_NOT_ACTIVE;
	}
	bb.writeUnsignedInt(snapFlags);

	// Write out playerstate
	bb.writeUnsignedInt(frame.ps.commandTime);
	bb.writeUnsignedInt(frame.ps.pm_type);
	bb.writeUnsignedInt(frame.ps.pm_flags);
	bb.writeUnsignedInt(frame.ps.pm_time);
	bb.writeUnsignedInt(frame.ps.gravity);
	bb.writeUnsignedInt(frame.ps.speed);

	bb.writeFloat(frame.ps.origin[0]);
	bb.writeFloat(frame.ps.origin[1]);
	bb.writeFloat(frame.ps.origin[2]);

	bb.writeFloat(frame.ps.velocity[0]);
	bb.writeFloat(frame.ps.velocity[1]);
	bb.writeFloat(frame.ps.velocity[2]);

	bb.writeFloat(frame.ps.viewangles[0]);
	bb.writeFloat(frame.ps.viewangles[1]);
	bb.writeFloat(frame.ps.viewangles[2]);

	com.NetchanSend(client.netchan, bb.buffer, bb.index);
}

function SendClientMessages() {
	for (var i = 0; i < svs.clients.length; i++) {
		var client = svs.clients[i];

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