/**
 * InitCGame
 */
function InitCGame() {
	clc.state = CA.LOADING;
	CG.Init(clc.serverMessageSequence, clc.lastExecutedServerCommand, clc.clientNum);
	// We will send a usercmd this frame, which will cause
	// the server to send us the first snapshot.
	clc.state = CA.PRIMED;
}

/**
 * ShutdownCGame
 */
function ShutdownCGame() {
	CG.Shutdown();
}

/**
 * GetGameState
 */
function GetGameState() {
	return cl.gameState;
}

/**
 * GetServerCommand
 */
function GetServerCommand(serverCommandNum) {
	// If we have irretrievably lost a reliable command, drop the connection.
	if (serverCommandNum <= clc.serverCommandSequence - COM.MAX_RELIABLE_COMMANDS) {
		COM.Error('GetServerCommand: a reliable command was cycled out');
		return null;
	}

	if (serverCommandNum > clc.serverCommandSequence) {
		COM.Error('GetServerCommand: requested a command not received');
		return null;
	}

	var cmd = clc.serverCommands[serverCommandNum % COM.MAX_RELIABLE_COMMANDS];
	clc.lastExecutedServerCommand = serverCommandNum;

	if (cmd.type === 'disconnect') {
		// Allow server to indicate why they were disconnected.
		// if (argc >= 2) {
		// 	COM.Error('Server disconnected', reason);
		// } else {
			COM.Error('Server disconnected');
		// }
	}

	if (cmd.type === 'cs') {
		var key = cmd.data.k;
		var val = cmd.data.v;
		ConfigStringModified(key, val);
		return cmd;
	}

	// // the clientLevelShot command is used during development
	// // to generate 128*128 screenshots from the intermission
	// // point of levels for the menu system to use
	// // we pass it along to the cgame to make apropriate adjustments,
	// // but we also clear the console and notify lines here
	// if ( !strcmp( cmd, "clientLevelShot" ) ) {
	// 	// don't do it if we aren't running the server locally,
	// 	// otherwise malicious remote servers could overwrite
	// 	// the existing thumbnails
	// 	if ( !com_sv_running->integer ) {
	// 		return false;
	// 	}
	// 	// close the console
	// 	Con_Close();
	// 	// take a special screenshot next frame
	// 	Cbuf_AddText( "wait ; wait ; wait ; wait ; screenshot levelshot\n" );
	// 	return true;
	// }

	// CGame can now act on the command.
	return cmd;
}

/**
 * ConfigStringModified
 */
function ConfigStringModified(key, val) {
	cl.gameState[key] = val;

	if (key === 'systemInfo') {
		// Parse serverId and other cvars.
		ParseSystemInfo();
	}
}

/**
 * GetCurrentUserCmdNumber
 */
function GetCurrentUserCmdNumber() {
	return cl.cmdNumber;
}

/**
 * GetUserCmd
 */
function GetUserCmd(cmdNumber, dest) {
	// cmds[cmdNumber] is the last properly generated command.

	// Can't return anything that we haven't created yet.
	if (cmdNumber > cl.cmdNumber) {
		COM.Error('GetUserCmd: ' + cmdNumber + ' >= ' + cl.cmdNumber);
	}

	// The usercmd has been overwritten in the wrapping
	// buffer because it is too far out of date.
	if (cmdNumber <= cl.cmdNumber - QS.CMD_BACKUP) {
		return null;
	}

	cl.cmds[cmdNumber & (QS.CMD_BACKUP-1)].clone(dest);
}

/**
 * SetUserCmdValue
 */
function SetUserCmdValue(name, val) {
	if (name === 'weapon') {
		cl.cgameWeapon = val;
	} else if (name === 'sensitivity') {
		cl.cgameSensitivity = val;
	}
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
		if (cl_showTimeDelta.getAsInt()) {
			log('AdjustTimeDelta: <RESET>');
		}
	} else if (deltaDelta > 100) {
		// fast adjust, cut the difference in half
		cl.serverTimeDelta = (cl.serverTimeDelta + newDelta) / 2;
		if (cl_showTimeDelta.getAsInt()) {
			log('AdjustTimeDelta: <FAST>');
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

	if (cl_showTimeDelta.getAsInt()) {
		log('AdjustTimeDelta: ' + cl.serverTimeDelta);
	}
}

/**
 * SetCGameTime
 */
function SetCGameTime() {
	// Getting a valid frame message ends the connection process.
	if (clc.state !== CA.ACTIVE) {
		if (clc.state !== CA.PRIMED) {
			return;
		}

		log('Waiting for first snapshot');

		if (cl.newSnapshots) {
			cl.newSnapshots = false;
			FirstSnapshot();
		}

		if (clc.state !== CA.ACTIVE) {
			return;
		}
	}

	// If we have gotten to this point, cl.snap is guaranteed to be valid.
	if (!cl.snap.valid) {
		COM.Error('SetCGameTime: !cl.snap.valid');
	}

	if (cl.snap.serverTime < cl.oldFrameServerTime) {
		COM.Error('cl.snap.serverTime < cl.oldFrameServerTime');
	}
	cl.oldFrameServerTime = cl.snap.serverTime;

	// Get our current view of time.
	// cl_timeNudge is a user adjustable cvar that allows more
	// or less latency to be added in the interest of better
	// smoothness or better responsiveness.
	var tn = cl_timeNudge.getAsInt();
	if (tn < -30) {
		tn = -30;
	} else if (tn > 30) {
		tn = 30;
	}

	cl.serverTime = cls.realTime + cl.serverTimeDelta + tn;

	// Guarantee that time will never flow backwards, even if
	// serverTimeDelta made an adjustment.
	if (cl.serverTime < cl.oldServerTime) {
		cl.serverTime = cl.oldServerTime;
	}
	cl.oldServerTime = cl.serverTime;

	// If we are almost past the latest frame (without timeNudge), we will
	// try and adjust back a bit when the next snapshot arrives.
	if (cls.realTime + cl.serverTimeDelta >= cl.snap.serverTime - 5) {
		cl.extrapolatedSnapshot = true;
	}

	// If we have gotten new snapshots, drift serverTimeDelta.
	// Don't do this every frame, or a period of packet loss would
	// make a huge adjustment.
	if (cl.newSnapshots) {
		AdjustTimeDelta();
	}
}

/**
 * FirstSnapshot
 */
function FirstSnapshot() {
	// Ignore snapshots that don't have entities.
	if (cl.snap.snapFlags & QS.SNAPFLAG_NOT_ACTIVE) {
		return;
	}

	clc.state = CA.ACTIVE;

	// Set the timedelta so we are exactly on this first frame.
	cl.serverTimeDelta = cl.snap.serverTime - cls.realTime;
	cl.oldServerTime = cl.snap.serverTime;
}

/**
 * GetCurrentSnapshotNumber
 */
function GetCurrentSnapshotNumber() {
	return {
		snapshotNumber: cl.snap.messageNum,
		serverTime: cl.snap.serverTime
	};
}

/**
 * GetSnapshot
 */
function GetSnapshot(snapshotNumber) {
	if (snapshotNumber > cl.snap.messageNum) {
		COM.Error('GetSnapshot: snapshotNumber > cl.snapshot.messageNum');
	}

	// If the frame has fallen out of the circular buffer, we can't return it.
	if (cl.snap.messageNum - snapshotNumber >= COM.PACKET_BACKUP) {
		return null;
	}

	// If the frame is not valid, we can't return it.
	var snap = cl.snapshots[snapshotNumber % COM.PACKET_BACKUP];
	if (!snap.valid) {
		return null;
	}

	// If the entities in the frame have fallen out of their circular buffer, we can't return it.
	if (cl.parseEntitiesNum - snap.parseEntitiesNum >= MAX_PARSE_ENTITIES) {
		return null;
	}

	// Make a copy of the snapshot.
	var result = snap.clone();

	// TODO: Should split up cgame and client snapshot structures, adding this property to the
	// cgame version.
	result.entities = new Array(result.numEntities);
	for (var i = 0; i < result.numEntities; i++) {
		result.entities[i] = cl.parseEntities[(result.parseEntitiesNum + i) % MAX_PARSE_ENTITIES];
	}

	return result;
}