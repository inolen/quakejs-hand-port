/**
 * BuildSolidList
 *
 * When a new cg.snap has been set, this function builds a sublist
 * of the entities that are actually solid, to make for more
 * efficient collision detection.
 */
function BuildSolidList() {
	// TODO Is this safe?
	cg.solidEntities.length = 0;
	cg.triggerEntities.length = 0;

	var snap;

	if (cg.nextSnap && !cg.nextFrameTeleport && !cg.thisFrameTeleport) {
		snap = cg.nextSnap;
	} else {
		snap = cg.snap;
	}

	for (var i = 0; i < snap.numEntities; i++ ) {
		var cent = cg.entities[snap.entities[i].number];
		var es = cent.currentState;

		if (es.eType === EntityType.ITEM || es.eType == EntityType.PUSH_TRIGGER || es.eType === EntityType.TELEPORT_TRIGGER) {
			cg.triggerEntities.push(cent);
			continue;
		}

		if (cent.nextState.solid) {
			cg.solidEntities.push(cent);
			continue;
		}
	}
}

// /**
//  * ClipMoveToEntities
//  */
// function ClipMoveToEntities(tr, start, end, mins, maxs, skipNumber, mask) {
// 	for (var i = 0; i < cg_numSolidEntities; i++) {
// 		var cent = cg_solidEntities[ i ];
// 		var es = cent.currentState;

// 		if (es.number === skipNumber) {
// 			continue;
// 		}

// 		var cmodel;
// 		if (es.solid == SOLID_BMODEL) {
// 			// Special value for bmodel.
// 			cmodel = imp.cm_InlineModel(es.modelIndex);
// 			vec3.set(cent.lerpAngles, angles);
// 			bg.EvaluateTrajectory(cent.currentState.pos, cg.physicsTime, origin);
// 		} else {
// 			// Encoded bbox.
// 			var x = (es.solid & 255);
// 			var zd = ((es.solid>>8) & 255);
// 			var zu = ((es.solid>>16) & 255) - 32;

// 			var bmins = [0, 0, 0];
// 			var bmaxs = [0, 0, 0];

// 			bmins[0] = bmins[1] = -x;
// 			bmaxs[0] = bmaxs[1] = x;
// 			bmins[2] = -zd;
// 			bmaxs[2] = zu;

// 			cmodel = imp.cm_TempBoxModel(bmins, bmaxs);
// 			vec3.set(angles, [0, 0, 0]);
// 			vec3.set(cent.lerpOrigin, origin);
// 		}

// 		var trace = imp.cm_TransformedBoxTrace(start, end, mins, maxs, cmodel, mask, origin, angles);

// 		if (trace.allSolid || trace.fraction < tw.fraction) {
// 			trace.entityNum = es.number;
// 			trace.clone(tr);
// 		} else if (trace.startSolid) {
// 			tr.startSolid = true;
// 		}

// 		if (tr.allSolid) {
// 			return;
// 		}
// 	}
// }

/**
 * Trace
 */
function Trace(start, end, mins, maxs, skipNumber, mask) {
	var trace = imp.cm_BoxTrace(start, end, mins, maxs, 0, mask);
	trace.entityNum = trace.fraction !== 1.0 ? sh.ENTITYNUM_WORLD : sh.ENTITYNUM_NONE;

	// check all other solid models
	//CG_ClipMoveToEntities (start, mins, maxs, end, skipNumber, mask, &t);

	return trace;
}

/**
 * InterpolatePlayerState
 */
function InterpolatePlayerState(grabAngles) {
	var ps = cg.snap.ps.clone(cg.predictedPlayerState);
	var prev = cg.snap;
	var next = cg.nextSnap;

	// If we are still allowing local input, short circuit the view angles.
	if (grabAngles) {
		var cmdNum = imp.cl_GetCurrentUserCmdNumber();
		var cmd = imp.cl_GetUserCmd(cmdNum);
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
			ps.viewangles[i] = qm.LerpAngle(prev.ps.viewangles[i], next.ps.viewangles[i], f);
		}
		ps.velocity[i] = prev.ps.velocity[i] + f * (next.ps.velocity[i] - prev.ps.velocity[i]);
	}
}

/**
 * PredictPlayerState
 */
function PredictPlayerState() {
	cg.hyperspace = false;  // will be set if touching a trigger_teleport

	// If this is the first frame we must guarantee predictedPlayerState 
	// is valid even if there is some other error condition.
	if (!cg.validPPS) {
		cg.validPPS = true;
		cg.snap.ps.clone(cg.predictedPlayerState);
	}

	// Just copy the moves when following.
	if (cg.snap.ps.pm_flags & PmoveFlags.FOLLOW) {
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
	var latest = imp.cl_GetCurrentUserCmdNumber();
	var oldest = latest - sh.CMD_BACKUP + 1;
	var oldestCmd = imp.cl_GetUserCmd(oldest);

	// Special check for map_restart.
	if (oldestCmd.serverTime > cg.snap.ps.commandTime && oldestCmd.serverTime < cg.time) {
		if (cg_showmiss()) {
			log('exceeded PACKET_BACKUP on commands');
		}
		return;
	}

	// Get the latest command so we can know which commands are from previous map_restarts.
	var latestCmd = imp.cl_GetUserCmd(latest);

	// Get the most recent information we have, even if the server time
	// is beyond our current cg.time, because predicted player positions
	// are going to be ahead of everything else anyway.
	if (cg.nextSnap && !cg.nextFrameTeleport && !cg.thisFrameTeleport) {
		cg.nextSnap.ps.clone(cg.predictedPlayerState);
		cg.physicsTime = cg.nextSnap.serverTime;
	} else {
		cg.snap.ps.clone(cg.predictedPlayerState);
		cg.physicsTime = cg.snap.serverTime;
	}

	// Prepare for pmove.
	// TODO memset() this thing
	cg.pmove.ps = cg.predictedPlayerState;
	cg.pmove.trace = Trace;
	// cg.pmove.pointcontents = CG_PointContents;
	if (cg.pmove.ps.pm_type === PmoveType.DEAD) {
		cg.pmove.tracemask = ContentMasks.PLAYERSOLID & ~ContentTypes.BODY;
	} else {
		cg.pmove.tracemask = ContentMasks.PLAYERSOLID;
	}
	// if (cg.snap->ps.persistant[PERS_TEAM] == TEAM_SPECTATOR) {
	// 	cg.pmove.tracemask &= ~ContentTypes.BODY;	// spectators can fly through bodies
	// }
	// cg.pmove.noFootsteps = ( cgs.dmflags & DF_NO_FOOTSTEPS ) > 0;

	// Run cmds.
	var moved = false;
	for (var cmdNum = oldest; cmdNum <= latest; cmdNum++) {
		// Get the command.
		cg.pmove.cmd = imp.cl_GetUserCmd(cmdNum);

		// Don't do anything if the time is before the snapshot player time.
		if (cg.pmove.cmd.serverTime <= cg.predictedPlayerState.commandTime) {
			continue;
		}

		// Don't do anything if the command was from a previous map_restart.
		if (cg.pmove.cmd.serverTime > latestCmd.serverTime) {
			continue;
		}

		// Check for a prediction error from last frame on a lan, this will often
		// be the exact value from the snapshot, but on a wan we will have to
		// predict several commands to get to the point we want to compaimp.re_
		// if (cg.predictedPlayerState.commandTime === oldPlayerState.commandTime) {
		// 	if (cg.thisFrameTeleport) {
		// 		// A teleport will not cause an error decay
		// 		cg.predictedError = [0, 0, 0];
		// 		if (cg_showmiss()) {
		// 			log('PredictionTeleport');
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
		// 				log('Prediction error');
		// 			}
		// 		}
		// 		var delta = vec3.subtract(oldPlayerState.origin, adjusted, [0, 0, 0]);
		// 		var len = vec3.length(delta);
		// 		if (len > 0.1) {
		// 			if (cg_showmiss()) {
		// 				log('Prediction miss: ' + len);
		// 			}
		// 			if (cg_errorDecay()) {
		// 				var t = cg.time - cg.predictedErrorTime;
		// 				var f = (cg_errorDecay() - t) / cg_errorDecay();
		// 				if (f < 0) {
		// 					f = 0;
		// 				} else if (f > 0 && cg_showmiss()) {
		// 					log('Double prediction decay: ' + f);
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
		//cg.pmove.gauntletHit = qfalse;
		
		bg.Pmove(cg.pmove);

		moved = true;

		// add push trigger movement effects
		//CG_TouchTriggerPrediction();
	}

	if (cg_showmiss() > 1) {
		log('[' + cg.pmove.cmd.serverTime + ' : ' + cg.time + ']');
	}

	if (!moved) {
		if (cg_showmiss()) {
			log("not moved");
		}
		return;
	}

	// // adjust for the movement of the groundentity
	// CG_AdjustPositionForMover( cg.predictedPlayerState.origin, 
	// 	cg.predictedPlayerState.groundEntityNum, 
	// 	cg.physicsTime, cg.time, cg.predictedPlayerState.origin, cg.predictedPlayerState.viewangles, cg.predictedPlayerState.viewangles);

	// if (cg_showmiss()) {
	// 	if (cg.predictedPlayerState.eventSequence > oldPlayerState.eventSequence + sh.MAX_PS_EVENTS) {
	// 		CG_Printf("WARNING: dropped event\n");
	// 	}
	// }

	// Fire events and other transition triggered things
	TransitionPlayerState(cg.predictedPlayerState, oldPlayerState);

	// if (cg_showmiss()) {
	// 	if (cg.eventSequence > cg.predictedPlayerState.eventSequence) {
	// 		log('WARNING: double event');
	// 		cg.eventSequence = cg.predictedPlayerState.eventSequence;
	// 	}
	// }
}