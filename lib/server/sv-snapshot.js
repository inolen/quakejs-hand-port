/**
 * BuildClientSnapshot
 *
 * Decides which entities are going to be visible to the client, and
 * copies off the playerstate and areabits.
 */
function BuildClientSnapshot(client, msg) {
	var clent = client.gentity;
	if (!clent || client.state === CS.ZOMBIE) {
		return; // Client hasn't entered world yet.
	}

	// Bump the counter used to prevent double adding.
	sv.snapshotCounter++;

	var frame = client.frames[client.netchan.outgoingSequence % COM.PACKET_BACKUP];
	var clientNum = GetClientNum(client);
	var ps = GM.GetClientPlayerstate(clientNum);

	// Copy the current PlayerState off.
	ps.clone(frame.ps);

	// Never send client's own entity, because it can
	// be regenerated from the playerstate.
	var svEnt = sv.svEntities[clientNum];
	svEnt.snapshotCounter = sv.snapshotCounter;

	// Find the client's viewpoint.
	var org = vec3.create(ps.origin);
	org[2] += ps.viewheight;

	var entityNumbers = [];
	AddEntitiesVisibleFromPoint(clent.s.arenaNum, org, frame, entityNumbers);

	// If there were portals visible, there may be out of order entities
	// in the list which will need to be resorted for the delta compression
	// to work correctly. This also catches the error condition
	// of an entity being included twice.
	entityNumbers.sort(CompareEntityNumbers);

	// // Now that all viewpoint's areabits have been OR'd together, invert
	// // all of them to make it a mask vector, which is what the renderer wants.
	// for ( i = 0 ; i < MAX_MAP_AREA_BYTES/4 ; i++ ) {
	// 	((int *)frame->areabits)[i] = ((int *)frame->areabits)[i] ^ -1;
	// }

	frame.numEntities = 0;
	frame.firstEntity = svs.nextSnapshotEntities;

	// Copy the entity states out.
	for (var i = 0; i < entityNumbers.length; i++) {
		var ent = GentityForNum(entityNumbers[i]);
		var state = svs.snapshotEntities[svs.nextSnapshotEntities % MAX_SNAPSHOT_ENTITIES];

		ent.s.clone(state);

		svs.nextSnapshotEntities++;
		frame.numEntities++;
	}
}

/**
 * CompareEntityNumbers
 */
function CompareEntityNumbers(a, b) {
	if (a === b) {
		error('CompareEntityNumbers duplicated entity');
	}

	if (a < b) {
		return -1;
	}

	return 1;
}

/**
 * AddEntitiesVisibleFromPoint
 */
function AddEntitiesVisibleFromPoint(arenaNum, origin, frame, eNums) {
	var leafnum = CM.PointLeafnum(origin);
	var clientarea = CM.LeafArea(leafnum);
	var clientcluster = CM.LeafCluster(leafnum);

	// Calculate the visible areas.
	// frame->areabytes = CM.WriteAreaBits( frame->areabits, clientarea );

	for (var i = 0; i < QS.MAX_GENTITIES; i++) {
		var ent = GentityForNum(i);

		// Never send entities that aren't linked in.
		if (!ent || !ent.r.linked) {
			continue;
		}

		// FIXME Send ents from other arenas when looking through portals.
		if (ent.s.arenaNum !== arenaNum) {
			continue;
		}

		if (ent.s.number !== i) {
			error('Entity number does not match: ent.s.number: ' + ent.s.number + ', i: ' + i);
		}

		// Entities can be flagged to explicitly not be sent to the client.
		if (ent.r.svFlags & GM.SVF.NOCLIENT) {
			continue;
		}

		// Entities can be flagged to be sent to only one client.
		if (ent.r.svFlags & GM.SVF.SINGLECLIENT) {
			if (ent.r.singleClient !== frame.ps.clientNum) {
				continue;
			}
		}

		// Entities can be flagged to be sent to everyone but one client.
		if (ent.r.svFlags & GM.SVF.NOTSINGLECLIENT) {
			if (ent.r.singleClient === frame.ps.clientNum) {
				continue;
			}
		}

		var svEnt = SvEntityForGentity(ent);

		// Don't double add an entity through portals.
		if (svEnt.snapshotCounter === sv.snapshotCounter) {
			continue;
		}

		// Broadcast entities are always sent.
		if (ent.r.svFlags & GM.SVF.BROADCAST) {
			AddEntToSnapshot(svEnt, ent, eNums);
			continue;
		}

		// Ignore if not touching a PVS leaf.
		// Check area.
		if (!CM.AreasConnected(clientarea, svEnt.areanum)) {
			// Doors can legally straddle two areas, so
			// we may need to check another one
			if (!CM.AreasConnected(clientarea, svEnt.areanum2)) {
				continue;  // blocked by a door
			}
		}

		// Check individual leafs.
		if (!svEnt.numClusters ) {
			continue;
		}
		var j = 0;
		var k = 0;
		// bitvector = clientpvs;
		for (j = 0; j < svEnt.numClusters; j++) {
			k = svEnt.clusternums[j];

			if (CM.ClusterVisible(clientcluster, k)) {
				break;
			}
		}

		// If we haven't found it to be visible,
		// check overflow clusters that coudln't be stored.
		if (j === svEnt.numClusters) {
			if (svEnt.lastCluster) {
				for (; k <= svEnt.lastCluster; k++) {
					if (CM.ClusterVisible(clientcluster, k)) {
						break;
					}
				}
				if (k === svEnt.lastCluster ) {
					continue;  // not visible
				}
			} else {
				continue;
			}
		}

		// Add it.
		AddEntToSnapshot(svEnt, ent, eNums);

		// If it's a portal entity, add everything visible from its camera position.
		if (ent.r.svFlags & GM.SVF.PORTAL) {
			if (ent.s.generic1) {
				var dir = vec3.subtract(ent.s.origin, origin, vec3.create());

				if (vec3.squaredLength(dir) > ent.s.generic1 * ent.s.generic1) {
					continue;
				}
			}

			AddEntitiesVisibleFromPoint(arenaNum, ent.s.origin2, frame, eNums);
		}
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
	// Build the snapshot.
	BuildClientSnapshot(client);

	var msg = new BitStream(svs.msgBuffer);

	msg.writeInt32(client.lastClientCommand);

	// Send any reliable server commands.
	UpdateServerCommandsToClient(client, msg);

	// Send over all the relevant player and entity states.
	WriteSnapshotToClient(client, msg);

	msg.writeInt8(COM.SVM.EOF);

	// Record information about the message
	client.frames[client.netchan.outgoingSequence % COM.PACKET_BACKUP].messageSent = svs.time;
	client.frames[client.netchan.outgoingSequence % COM.PACKET_BACKUP].messageAcked = -1;

	COM.NetchanTransmit(client.netchan, msg.buffer, msg.byteIndex);
}

/**
 * UpdateServerCommandsToClient
 *
 * (re)send all server commands the client hasn't acknowledged yet.
 */
function UpdateServerCommandsToClient(client, msg) {
	// Write any unacknowledged serverCommands.
	for (var i = client.reliableAcknowledge + 1; i <= client.reliableSequence; i++) {
		var cmd = client.reliableCommands[i % COM.MAX_RELIABLE_COMMANDS];

		msg.writeInt8(COM.SVM.serverCommand);
		msg.writeInt32(i);
		msg.writeASCIIString(JSON.stringify(cmd));
	}
}

/**
 * WriteSnapshotToClient
 */
function WriteSnapshotToClient(client, msg) {
	// This is the snapshot we are creating.
	var frame = client.frames[client.netchan.outgoingSequence % COM.PACKET_BACKUP];
	var oldframe = null;
	var lastframe = 0;

	// Try to use a previous frame as the source for delta compressing the snapshot.
	if (client.deltaMessage <= 0 || client.state !== CS.ACTIVE) {
		// Client is asking for a retransmit.
		oldframe = null;
		lastframe = 0;
	} else if (client.netchan.outgoingSequence - client.deltaMessage >= (COM.PACKET_BACKUP - 3)) {
		// Client hasn't gotten a good message through in a long time.
		// log(client.name, ': Delta request from out of date packet.');
		oldframe = null;
		lastframe = 0;
	} else {
		// We have a valid snapshot to delta from
		oldframe = client.frames[client.deltaMessage % COM.PACKET_BACKUP];
		lastframe = client.netchan.outgoingSequence - client.deltaMessage;

		// The snapshot's entities may still have rolled off the buffer, though.
		if (oldframe.firstEntity <= svs.nextSnapshotEntities - svs.numSnapshotEntities) {
			log(client.name, ': Delta request from out of date entities.');
			oldframe = null;
			lastframe = 0;
		}
	}

	msg.writeUint8(COM.SVM.snapshot);

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
	msg.writeInt32(serverTime);

	// What we're delta'ing from.
	msg.writeInt8(lastframe);

	var snapFlags = svs.snapFlagServerBit;
	if (client.state !== CS.ACTIVE) {
		snapFlags |= QS.SNAPFLAG_NOT_ACTIVE;
	}
	msg.writeInt32(snapFlags);

	// // send over the areabits
	// MSG_WriteByte (msg, frame->areabytes);
	// MSG_WriteData (msg, frame->areabits, frame->areabytes);

	// Delta encode the playerstate.
	COM.WriteDeltaPlayerState(msg, oldframe ? oldframe.ps : null, frame.ps);

	// Delta encode the entities.
	WriteSnapshotEntities(msg, oldframe, frame);
}

/**
 * WriteSnapshotEntities
 */
function WriteSnapshotEntities(msg, from, to) {
	var oldent, newent;
	var oldindex, newindex;
	var oldnum, newnum;
	var fromNumEntities;

	// Generate the delta update.
	fromNumEntities = from ? from.numEntities : 0;

	oldent = null;
	newent = null;
	oldindex = 0;
	newindex = 0;

	while (newindex < to.numEntities || oldindex < fromNumEntities) {
		if (newindex >= to.numEntities) {
			newnum = 9999;
		} else {
			newent = svs.snapshotEntities[(to.firstEntity + newindex) % MAX_SNAPSHOT_ENTITIES];
			newnum = newent.number;
		}

		if (oldindex >= fromNumEntities) {
			oldnum = 9999;
		} else {
			oldent = svs.snapshotEntities[(from.firstEntity + oldindex) % MAX_SNAPSHOT_ENTITIES];
			oldnum = oldent.number;
		}

		if (newnum === oldnum) {
			// Delta update from old position.
			// Because the force parm is false, this will not result
			// in any bytes being emited if the entity has not changed at all.
			COM.WriteDeltaEntityState(msg, oldent, newent, false);
			oldindex++;
			newindex++;
			continue;
		}

		if (newnum < oldnum) {
			// This is a new entity, send it from the baseline.
			COM.WriteDeltaEntityState(msg, sv.svEntities[newnum].baseline, newent, true);
			newindex++;
			continue;
		}

		if (newnum > oldnum) {
			// The old entity isn't present in the new message.
			COM.WriteDeltaEntityState(msg, oldent, null, true);
			oldindex++;
			continue;
		}
	}

	msg.writeInt16(QS.MAX_GENTITIES-1);
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
			continue;  // not connected
		}

		if (svs.time - client.lastSnapshotTime < client.snapshotMsec) {
			continue;  // it's not time yet
		}

		SendClientSnapshot(client);
		client.lastSnapshotTime = svs.time;
	}
}