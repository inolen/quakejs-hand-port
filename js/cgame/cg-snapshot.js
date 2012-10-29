/**
 * ProcessSnapshots
 */
function ProcessSnapshots() {
	var snap;

	// See what the latest snapshot the client system has is.
	var info = cl.GetCurrentSnapshotNumber();

	cg.latestSnapshotTime = info.serverTime;

	if (info.snapshotNumber !== cg.latestSnapshotNum) {
		if (info.snapshotNumber < cg.latestSnapshotNum) {
			// this should never happen
			throw new Error('ProcessSnapshots: info.snapshotNumber < cg.latestSnapshotNum');
		}

		cg.latestSnapshotNum = info.snapshotNumber;
	}

	// If we have yet to receive a snapshot, check for it.
	// Once we have gotten the first snapshot, cg.snap will
	// always have valid data for the rest of the game.
	while (!cg.snap) {
		snap = ReadNextSnapshot();

		if (!snap) {
			// we can't continue until we get a snapshot
			return;
		}

		if (!(snap.snapFlags & SNAPFLAG_NOT_ACTIVE)) {
			SetInitialSnapshot(snap);
		}
	}

	// Loop until we either have a valid nextSnap with a serverTime
	// greater than cg.time to interpolate towards, or we run
	// out of available snapshots.
	while (true) {
		// If we don't have a nextframe, try and read a new one in.
		if (!cg.nextSnap) {
			snap = ReadNextSnapshot();

			// If we still don't have a nextframe, we will just have to extrapolate.
			if (!snap) {
				break;
			}

			SetNextSnap(snap);

			// If time went backwards, we have a level restart.
			if (cg.nextSnap.serverTime < cg.snap.serverTime ) {
				throw new Error('ProcessSnapshots: Server time went backwards');
			}
		}

		// if our time is < nextFrame's, we have a nice interpolating state.
		if (cg.time >= cg.snap.serverTime && cg.time < cg.nextSnap.serverTime) {
			break;
		}

		// we have passed the transition from nextFrame to frame
		TransitionSnapshot();
	};

	// Assert our valid conditions upon exiting
	if (cg.snap === null) {
		throw new Error('ProcessSnapshots: cg.snap == NULL');
	}

	if (cg.time < cg.snap.serverTime) {
		// this can happen right after a vid_restart
		cg.time = cg.snap.serverTime;
	}

	if (cg.nextSnap && cg.nextSnap.serverTime <= cg.time ) {
		throw new Error('ProcessSnapshots: cg.nextSnap.serverTime <= cg.time');
	}

	/*if (!cg.nextSnap) {
		console.log('ProcessSnapshots: No valid nextSnap.');
	}*/
}

/**
 * ReadNextSnapshot
 */
function ReadNextSnapshot() {
	if (cg.latestSnapshotNum > cgs.processedSnapshotNum + 1000) {
		console.warn('ReadNextSnapshot: way out of range, ' + cg.latestSnapshotNum + ' > ' + cgs.processedSnapshotNum);
	}

	while (cgs.processedSnapshotNum < cg.latestSnapshotNum) {
		// try to read the snapshot from the client system
		cgs.processedSnapshotNum++;
		var snap = cl.GetSnapshot(cgs.processedSnapshotNum);

		// if it succeeded, return
		if (snap) {
			return snap;
		}

		// GetSnapshot will return failure if the snapshot
		// never arrived, or  is so old that its entities
		// have been shoved off the end of the circular
		// buffer in the client system.

		// If there are additional snapshots, continue trying to
		// read them.
	}

	// nothing left to read
	return null;
}

/**
 * SetInitialSnapshot
 */
function SetInitialSnapshot(snap) {
	cg.snap = snap;

	console.log('Setting initial snapshot');

	bg.PlayerStateToEntityState(snap.ps, cg.entities[snap.ps.clientNum].currentState);

	// Sort out solid entities.
	BuildSolidList();

	for (var i = 0; i < snap.numEntities; i++) {
		var state = snap.entities[i];
		var cent = cg.entities[state.number];

		state.clone(cent.currentState);

		cent.interpolate = false;
		cent.currentValid = true;

		ResetEntity(cent);

		// check for events
		//CheckEvents( cent );
	}
}

/**
 * SetNextSnap
 */
function SetNextSnap(snap) {
	cg.nextSnap = snap;

	bg.PlayerStateToEntityState(snap.ps, cg.entities[snap.ps.clientNum].nextState);
	cg.entities[cg.snap.ps.clientNum].interpolate = true;

	// check for extrapolation errors
	for (var i = 0; i < snap.numEntities; i++) {
		var state = snap.entities[i];
		var cent = cg.entities[state.number];

		state.clone(cent.nextState);

		// if this frame is a teleport, or the entity wasn't in the previous frame, don't interpolate
		if (!cent.currentValid || ((cent.currentState.eFlags ^ state.eFlags) & EntityFlags.TELEPORT_BIT)) {
			cent.interpolate = false;
		} else {
			cent.interpolate = true;
		}
	}

	// If the next frame is a teleport for the playerstate, we can't interpolate.
	if (cg.snap && ((snap.ps.eFlags ^ cg.snap.ps.eFlags) & EntityFlags.TELEPORT_BIT)) {
		cg.nextFrameTeleport = true;
	} else {
		cg.nextFrameTeleport = false;
	}

	// If changing server restarts, don't interpolate.
	if ((cg.nextSnap.snapFlags ^ cg.snap.snapFlags) & SNAPFLAG_SERVERCOUNT) {
		cg.nextFrameTeleport = true;
	}

	BuildSolidList();
}

/**
 * TransitionSnapshot
 *
 * The transition point from snap to nextSnap has passed.
 */
function TransitionSnapshot() {
	if (!cg.snap) {
		throw new Error('TransitionSnapshot: NULL cg.snap');
	}
	if (!cg.nextSnap) {
		throw new Error('TransitionSnapshot: NULL cg.nextSnap');
	}

	// execute any server string commands before transitioning entities
	//ExecuteNewServerCommands(cg.nextSnap.serverCommandSequence);

	// clear the currentValid flag for all entities in the existing snapshot
	/*for (var i = 0; i < cg.snap.numEntities; i++) {
		cent = &cg_entities[cg.snap.entities[i].number];
		cent.currentValid = false;
	}*/

	// move nextSnap to snap and do the transitions
	var oldFrame = cg.snap;
	cg.snap = cg.nextSnap;

	bg.PlayerStateToEntityState(cg.snap.ps, cg.entities[cg.snap.ps.clientNum].currentState);
	cg.entities[cg.snap.ps.clientNum].interpolate = false;

	for (var i = 0; i < cg.snap.numEntities; i++) {
		var cent = cg.entities[cg.snap.entities[i].number];
		
		TransitionEntity(cent);

		// Remember time of snapshot this entity was last updated in.
		cent.snapShotTime = cg.snap.serverTime;
	}

	cg.nextSnap = null;

	/*// check for playerstate transition events
	if (oldFrame) {
		var ops = oldFrame.ps;
		var ps = cg.snap.ps;

		// teleporting checks are irrespective of prediction
		if ((ps.eFlags ^ ops.eFlags) & EntityFlags.TELEPORT_BIT) {
			cg.thisFrameTeleport = true; // will be cleared by prediction code
		}

		// if we are not doing client side movement prediction for any
		// reason, then the client events and view changes will be issued now
		if ((cg.snap.ps.pm_flags & PmoveFlags.FOLLOW)) {
			CG_TransitionPlayerState(ps, ops);
		}
	}*/
}

/**
 * ResetEntity
 */
function ResetEntity(cent) {
	/*// If the previous snapshot this entity was updated in is at least
	// an event window back in time then we can reset the previous event.
	if (cent.snapShotTime < cg.time - EVENT_VALID_MSEC) {
		cent.previousEvent = 0;
	}

	cent->trailTime = cg.snap->serverTime;*/

	vec3.set(cent.currentState.origin, cent.lerpOrigin);
	vec3.set(cent.currentState.angles, cent.lerpAngles);

	/*if (cent.currentState.eType === EntityType.PLAYER) {
		ResetPlayerEntity(cent);
	}*/
}

/**
 * TransitionEntity
 *
 * cent->nextState is moved to cent->currentState and events are fired.
 */
function TransitionEntity(cent) {
	cent.nextState.clone(cent.currentState);
	cent.currentValid = true;

	// Reset if the entity wasn't in the last frame or was teleported.
	if (!cent.interpolate) {
		ResetEntity(cent);
	}

	// Clear the next state. It will be set by the next SetNextSnap.
	cent.interpolate = false;

	// check for events
	//CG_CheckEvents( cent );
}
