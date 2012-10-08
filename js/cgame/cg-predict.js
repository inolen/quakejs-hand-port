function InterpolatePlayerState(grabAngles) {
	var ps = cg.predictedPlayerState = cg.snap.ps.clone();
	var prev = cg.snap;
	var next = cg.nextSnap;

	// If we are still allowing local input, short circuit the view angles.
	if (grabAngles) {
		var cmdNum = cl.GetCurrentUserCommandNumber();
		var cmd = cl.GetUserCommand(cmdNum);
		bg.UpdateViewAngles(ps, cmd);
	}

	// If the next frame is a teleport, we can't lerp to it.
	if (cg.nextFrameTeleport) {
		return;
	}

	if (!next || next.serverTime <= prev.serverTime) {
		return;
	}

	var f = (cg.time - prev.serverTime) / (next.serverTime - prev.serverTime);

	/*i = next->ps.bobCycle;
	if ( i < prev->ps.bobCycle ) {
		i += 256;		// handle wraparound
	}
	out->bobCycle = prev->ps.bobCycle + f * ( i - prev->ps.bobCycle );*/

	for (var i = 0; i < 3; i++) {
		ps.origin[i] = prev.ps.origin[i] + f * (next.ps.origin[i] - prev.ps.origin[i]);
		if (!grabAngles) {
			ps.viewangles[i] = LerpAngle(prev.ps.viewangles[i], next.ps.viewangles[i], f);
		}
		ps.velocity[i] = prev.ps.velocity[i] + f * (next.ps.velocity[i] - prev.ps.velocity[i]);
	}
}

function PredictPlayerState() {
	cg.hyperspace = false;	// will be set if touching a trigger_teleport

	// If this is the first frame we must guarantee predictedPlayerState 
	// is valid even if there is some other error condition.
	if (!cg.validPPS) {
		cg.validPPS = true;
		cg.predictedPlayerState = cg.snap.ps.clone();
	}

	// Just copy the moves when following.
	if (cg.snap.ps.pm_flags & PMF_FOLLOW) {
		InterpolatePlayerState(false);
		return;
	}

	if (cg_predict()) {
 		InterpolatePlayerState(true);
 		return;
	}

	// Save the state before the pmove so we can detect transitions.
	var oldPlayerState = cg.predictedPlayerState.clone();

	// If we don't have the commands right after the snapshot, we
	// can't accurately predict a current position, so just freeze at
	// the last good position we had.
	var latest = cl.GetCurrentUserCommandNumber();
	var oldest = latest - CMD_BACKUP + 1;
	var oldestCmd = cl.GetUserCommand(oldest);

	// Special check for map_restart.
	if (oldestCmd.serverTime > cg.snap.ps.commandTime && oldestCmd.serverTime < cg.time) {
		if (cg_showmiss()) {
			console.log('exceeded PACKET_BACKUP on commands');
		}
		return;
	}

	// Get the latest command so we can know which commands are from previous map_restarts.
	var latestCmd = cl.GetUserCommand(latest);

	// Get the most recent information we have, even if the server time
	// is beyond our current cg.time, because predicted player positions
	// are going to be ahead of everything else anyway.
	if (cg.nextSnap && !cg.nextFrameTeleport && !cg.thisFrameTeleport) {
		cg.predictedPlayerState = cg.nextSnap.ps.clone();
		cg.physicsTime = cg.nextSnap.serverTime;
	} else {
		cg.predictedPlayerState = cg.snap.ps.clone();
		cg.physicsTime = cg.snap.serverTime;
	}

	// Prepare for pmove.
	var cg_pmove = new PmoveInfo();
	cg_pmove.ps = cg.predictedPlayerState;
	cg_pmove.trace = cl.Trace;
	// cg_pmove.pointcontents = CG_PointContents;
	if (cg_pmove.ps.pm_type === PmoveType.DEAD) {
		cg_pmove.tracemask = MASK_PLAYERSOLID & ~CONTENTS_BODY;
	} else {
		cg_pmove.tracemask = MASK_PLAYERSOLID;
	}
	// if (cg.snap->ps.persistant[PERS_TEAM] == TEAM_SPECTATOR) {
	// 	cg_pmove.tracemask &= ~CONTENTS_BODY;	// spectators can fly through bodies
	// }
	// cg_pmove.noFootsteps = ( cgs.dmflags & DF_NO_FOOTSTEPS ) > 0;

	// Run cmds.
	var moved = false;
	for (var cmdNum = oldest; cmdNum <= latest; cmdNum++) {
		// Get the command.
		cg_pmove.cmd = cl.GetUserCommand(cmdNum);

		// Don't do anything if the time is before the snapshot player time.
		if (cg_pmove.cmd.serverTime <= cg.predictedPlayerState.commandTime) {
			continue;
		}

		// Don't do anything if the command was from a previous map_restart.
		if (cg_pmove.cmd.serverTime > latestCmd.serverTime) {
			continue;
		}

		// Check for a prediction error from last frame on a lan, this will often
		// be the exact value from the snapshot, but on a wan we will have to
		// predict several commands to get to the point we want to compare.
		// if (cg.predictedPlayerState.commandTime === oldPlayerState.commandTime) {
		// 	if (cg.thisFrameTeleport) {
		// 		// A teleport will not cause an error decay
		// 		cg.predictedError = [0, 0, 0];
		// 		if (cg_showmiss()) {
		// 			console.log('PredictionTeleport');
		// 		}
		// 		cg.thisFrameTeleport = false;
		// 	} else {
		// 		vec3_t adjusted, new_angles;
		// 		CG_AdjustPositionForMover( cg.predictedPlayerState.origin, 
		// 			cg.predictedPlayerState.groundEntityNum, cg.physicsTime, cg.oldTime, adjusted, cg.predictedPlayerState.viewangles, new_angles);

		// 		if (cg_showmiss()) {
		// 			if (oldPlayerState.origin[0] !== adjusted[0] ||
		// 				oldPlayerState.origin[1] !== adjusted[1]
		// 				oldPlayerState.origin[2] !== adjusted[2]) {
		// 				console.log('Prediction error');
		// 			}
		// 		}
		// 		var delta = vec3.subtract(oldPlayerState.origin, adjusted, [0, 0, 0]);
		// 		var len = vec3.length(delta);
		// 		if (len > 0.1) {
		// 			if (cg_showmiss()) {
		// 				console.log('Prediction miss: ' + len);
		// 			}
		// 			if (cg_errorDecay()) {
		// 				var t = cg.time - cg.predictedErrorTime;
		// 				var f = (cg_errorDecay() - t) / cg_errorDecay();
		// 				if (f < 0) {
		// 					f = 0;
		// 				} else if (f > 0 && cg_showmiss()) {
		// 					console.log('Double prediction decay: ' + f);
		// 				}
		// 				vec3.scale(cg.predictedError, f);
		// 			} else {
		// 				cg.predictedError = [0, 0, 0];
		// 			}
		// 			VectorAdd( delta, cg.predictedError, cg.predictedError );
		// 			cg.predictedErrorTime = cg.oldTime;
		// 		}
		// 	}
		// }

		// don't predict gauntlet firing, which is only supposed to happen
		// when it actually inflicts damage
		//cg_pmove.gauntletHit = qfalse;
		
		bg.Pmove(cg_pmove);

		moved = true;

		// add push trigger movement effects
		//CG_TouchTriggerPrediction();
	}

	if (cg_showmiss() > 1) {
		console.log('[' + cg_pmove.cmd.serverTime + ' : ' + cg.time + ']');
	}

	if (!moved) {
		if (cg_showmiss()) {
			console.log("not moved");
		}
		return;
	}

	// adjust for the movement of the groundentity
	/*CG_AdjustPositionForMover( cg.predictedPlayerState.origin, 
		cg.predictedPlayerState.groundEntityNum, 
		cg.physicsTime, cg.time, cg.predictedPlayerState.origin, cg.predictedPlayerState.viewangles, cg.predictedPlayerState.viewangles);

	if (cg_showmiss()) {
		if (cg.predictedPlayerState.eventSequence > oldPlayerState.eventSequence + MAX_PS_EVENTS) {
			CG_Printf("WARNING: dropped event\n");
		}
	}

	// fire events and other transition triggered things
	CG_TransitionPlayerState( &cg.predictedPlayerState, &oldPlayerState );

	if (cg_showmiss()) {
		if (cg.eventSequence > cg.predictedPlayerState.eventSequence) {
			console.log('WARNING: double event');
			cg.eventSequence = cg.predictedPlayerState.eventSequence;
		}
	}*/
}