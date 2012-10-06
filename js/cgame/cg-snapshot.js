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

		//if (!(snap->snapFlags & SNAPFLAG_NOT_ACTIVE)) {
			SetInitialSnapshot(snap);
		//}
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
}

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

function SetInitialSnapshot(snap) {
	cg.snap = snap;
}

function SetNextSnap(snap) {
	cg.nextSnap = snap;
}

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

	/*bg.PlayerStateToEntityState(cg.snap.ps, cg_entities[cg.snap.ps.clientNum].currentState);
	cg_entities[ cg.snap->ps.clientNum ].interpolate = qfalse;

	for ( i = 0 ; i < cg.snap->numEntities ; i++ ) {
		cent = &cg_entities[ cg.snap->entities[ i ].number ];
		CG_TransitionEntity( cent );

		// remember time of snapshot this entity was last updated in
		cent->snapShotTime = cg.snap->serverTime;
	}*/

	cg.nextSnap = null;

	// check for playerstate transition events
	/*if (oldFrame) {
		playerState_t	*ops, *ps;

		var ops = oldFrame.ps;
		var ps = cg.snap.ps;

		// teleporting checks are irrespective of prediction
		if ( ( ps->eFlags ^ ops->eFlags ) & EF_TELEPORT_BIT ) {
			cg.thisFrameTeleport = qtrue;	// will be cleared by prediction code
		}

		// if we are not doing client side movement prediction for any
		// reason, then the client events and view changes will be issued now
		if ((cg.snap->ps.pm_flags & PMF_FOLLOW)) {
			CG_TransitionPlayerState( ps, ops );
		}
	}*/
}