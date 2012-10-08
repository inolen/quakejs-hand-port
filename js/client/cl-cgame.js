function GetCurrentUserCommandNumber() {
	return cl.cmdNumber;
}

function GetUserCommand(cmdNumber) {
	// cmds[cmdNumber] is the last properly generated command.

	// Can't return anything that we haven't created yet.
	if (cmdNumber > cl.cmdNumber) {
		throw new Error('GetUserCommandd: ' + cmdNumber + ' >= ' + cl.cmdNumber);
	}

	// the usercmd has been overwritten in the wrapping
	// buffer because it is too far out of date
	if (cmdNumber <= cl.cmdNumber - CMD_BACKUP) {
		return null;
	}

	return cl.cmds[cmdNumber & CMD_MASK];
}

/**
 * AdjustTimeDelta
 *
 * Adjust the clients view of server time.
 *
 * We attempt to have cl.serverTime exactly equal the server's view
 * of time plus the timeNudge, but with variable latencies over
 * the internet it will often need to drift a bit to match conditions.

 * Our ideal time would be to have the adjusted time approach, but not pass,
 * the very latest snapshot.

 * Adjustments are only made when a new snapshot arrives with a rational
 * latency, which keeps the adjustment process framerate independent and
 * prevents massive overadjustment during times of significant packet loss
 * or bursted delayed packets.
 */
var RESET_TIME = 500;

function AdjustTimeDelta() {
	cl.newSnapshots = false;

	var newDelta = cl.snap.serverTime - cls.realTime;
	var deltaDelta = Math.abs(newDelta - cl.serverTimeDelta);

	if (deltaDelta > RESET_TIME) {
		cl.serverTimeDelta = newDelta;
		cl.oldServerTime = cl.snap.serverTime;
		cl.serverTime = cl.snap.serverTime;
		if (cl_showTimeDelta()) {
			console.log('AdjustTimeDelta: <RESET>');
		}
	} else if (deltaDelta > 100) {
		// fast adjust, cut the difference in half
		cl.serverTimeDelta = (cl.serverTimeDelta + newDelta) >> 1;
		if (cl_showTimeDelta()) {
			console.log('AdjustTimeDelta: <FAST>');
		}
	} else {
		// slow drift adjust, only move 1 or 2 msec

		// if any of the frames between this and the previous snapshot
		// had to be extrapolated, nudge our sense of time back a little
		// the granularity of +1 / -2 is too high for timescale modified frametimes
		//if (com_timescale->value == 0 || com_timescale->value == 1) {
			if (cl.extrapolatedSnapshot) {
				cl.extrapolatedSnapshot = false;
				cl.serverTimeDelta -= 2;
			} else {
				// otherwise, move our sense of time forward to minimize total latency
				cl.serverTimeDelta++;
			}
		//}
	}

	if (cl_showTimeDelta()) {
		console.log('AdjustTimeDelta: ' + cl.serverTimeDelta);
	}
}

function SetCGameTime() {
	// Getting a valid frame message ends the connection process.
	if (clc.state !== ConnectionState.ACTIVE) {
		if (clc.state !== ConnectionState.PRIMED) {
			return;
		}

		if (cl.newSnapshots) {
			cl.newSnapshots = false;
			FirstSnapshot();
		}
		
		if (clc.state !== ConnectionState.ACTIVE) {
			return;
		}
	}

	// If we have gotten to this point, cl.snap is guaranteed to be valid.
	if (!cl.snap.valid) {
		throw new Error('SetCGameTime: !cl.snap.valid');
	}

	if (cl.snap.serverTime < cl.oldFrameServerTime) {
		throw new Error('cl.snap.serverTime < cl.oldFrameServerTime');
	}
	cl.oldFrameServerTime = cl.snap.serverTime;

	// Get our current view of time.
	cl.serverTime = cls.realTime + cl.serverTimeDelta;

	// Guarantee that time will never flow backwards, even if
	// serverTimeDelta made an adjustment.
	if (cl.serverTime < cl.oldServerTime) {
		cl.serverTime = cl.oldServerTime;
	}
	cl.oldServerTime = cl.serverTime;

	// If we are almost past the latest frame (without timeNudge), we will
	// try and adjust back a bit when the next snapshot arrives.
	if ( cls.realTime + cl.serverTimeDelta >= cl.snap.serverTime - 5 ) {
		cl.extrapolatedSnapshot = true;
	}

	// If we have gotten new snapshots, drift serverTimeDelta.
	// Don't do this every frame, or a period of packet loss would
	// make a huge adjustment.
	if (cl.newSnapshots) {
		AdjustTimeDelta();
	}
}

function FirstSnapshot() {
	// Ignore snapshots that don't have entities.
	if (cl.snap.snapFlags & SNAPFLAG_NOT_ACTIVE) {
		return;
	}

	clc.state = ConnectionState.ACTIVE;

	// Set the timedelta so we are exactly on this first frame.
	cl.serverTimeDelta = cl.snap.serverTime - cls.realTime;
	cl.oldServerTime = cl.snap.serverTime;
}

function GetCurrentSnapshotNumber() {
	return {
		snapshotNumber: cl.snap.messageNum,
		serverTime: cl.snap.serverTime
	};
}

function GetSnapshot(snapshotNumber) {
	if (snapshotNumber > cl.snap.messageNum) {
		throw new Error('GetSnapshot: snapshotNumber > cl.snapshot.messageNum');
	}

	// if the frame has fallen out of the circular buffer, we can't return it
	if (cl.snap.messageNum - snapshotNumber >= PACKET_BACKUP) {
		return null;
	}

	// if the frame is not valid, we can't return it
	var snap = cl.snapshots[snapshotNumber & PACKET_MASK];
	if (!snap.valid) {
		return null;
	}

	// If the entities in the frame have fallen out of their circular buffer, we can't return it.
	/*if (cl.parseEntitiesNum - snapshot.parseEntitiesNum >= MAX_PARSE_ENTITIES) {
		return null;
	}
	
	// TODO: Should split up cgame and client snapshot structures, adding this property to the
	// cgame version.
	snapshot.es = new Array(snapshot.numEntities);

	for (var i = 0; i < snapshot.numEntities; i++) {
		snapshot.es[i] = cl.parseEntities[(snapshot.parseEntitiesNum + i) & (MAX_PARSE_ENTITIES-1)];
	}*/

	return snap;
}