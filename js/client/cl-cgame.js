function SetCGameTime() {
	// Getting a valid frame message ends the connection process.
	if (clc.state !== CA_ACTIVE) {
		if (clc.state !== CA_PRIMED) {
			return;
		}

		if (cl.newSnapshots) {
			cl.newSnapshots = false;
			FirstSnapshot();
		}
		
		if (clc.state !== CA_ACTIVE) {
			return;
		}
	}	

	// If we have gotten to this point, cl.snap is guaranteed to be valid.
	if (!cl.snap.valid) {
		throw new Error('SetCGameTime: !cl.snap.valid');
	}

	/*if (cl.snap.serverTime < cl.oldFrameServerTime) {
		throw new Error('cl.snap.serverTime < cl.oldFrameServerTime');
	}
	cl.oldFrameServerTime = cl.snap.serverTime;*/

	// Get our current view of time.
	cl.serverTime = cls.realTime + cl.serverTimeDelta;

	// Guarantee that time will never flow backwards, even if
	// serverTimeDelta made an adjustment.
	if (cl.serverTime < cl.oldServerTime) {
		cl.serverTime = cl.oldServerTime;
	}
	cl.oldServerTime = cl.serverTime;

	/*// note if we are almost past the latest frame (without timeNudge),
	// so we will try and adjust back a bit when the next snapshot arrives
	if ( cls.realtime + cl.serverTimeDelta >= cl.snap.serverTime - 5 ) {
		cl.extrapolatedSnapshot = qtrue;
	}*/
}

function FirstSnapshot() {
	// Ignore snapshots that don't have entities.
	if (cl.snap.snapFlags & SNAPFLAG_NOT_ACTIVE) {
		return;
	}

	clc.state = CA_ACTIVE;

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