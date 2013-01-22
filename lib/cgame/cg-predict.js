/**
 * BuildSolidList
 *
 * When a new cg.snap has been set, this function builds a sublist
 * of the entities that are actually solid, to make for more
 * efficient collision detection.
 */
function BuildSolidList() {
	cg.numSolidEntities = 0;
	cg.numTriggerEntities = 0;

	var snap;

	if (cg.nextSnap && !cg.nextFrameTeleport && !cg.thisFrameTeleport) {
		snap = cg.nextSnap;
	} else {
		snap = cg.snap;
	}

	for (var i = 0; i < snap.numEntities; i++ ) {
		var cent = cg.entities[snap.entities[i].number];
		var es = cent.currentState;

		if (es.eType === ET.ITEM || es.eType == ET.PUSH_TRIGGER || es.eType === ET.TELEPORT_TRIGGER) {
			cg.triggerEntities[cg.numTriggerEntities++] = cent;
			continue;
		}

		if (cent.nextState.solid) {
			cg.solidEntities[cg.numSolidEntities++] = cent;
			continue;
		}
	}
}

/**
 * Trace
 */
function Trace(start, end, mins, maxs, arenaNum, passEntityNum, mask) {
	var trace = cm.BoxTrace(start, end, mins, maxs, 0, mask);
	trace.entityNum = trace.fraction !== 1.0 ? ENTITYNUM_WORLD : ENTITYNUM_NONE;

	// Check all other solid models.
	ClipMoveToEntities(trace, start, end, mins, maxs, passEntityNum, mask);

	return trace;
}

/**
 * ClipMoveToEntities
 */
function ClipMoveToEntities(tr, start, end, mins, maxs, arenaNum, passEntityNum, mask) {
	var origin = vec3.create();
	var angles = vec3.create();

	for (var i = 0; i < cg.numSolidEntities; i++) {
		var cent = cg.solidEntities[i];
		var es = cent.currentState;

		// The server shouldn't be sending us these.
		if (es.arenaNum !== arenaNum) {
			continue;
		}

		if (es.number === passEntityNum) {
			continue;
		}

		var cmodel;
		if (es.solid === SOLID_BMODEL) {
			// Special value for bmodel.
			cmodel = cm.InlineModel(es.modelIndex);
			vec3.set(cent.lerpAngles, angles);
			bg.EvaluateTrajectory(cent.currentState.pos, cg.physicsTime, origin);
		} else {
			// Encoded bbox.
			var x = (es.solid & 255);
			var zd = ((es.solid >> 8) & 255);
			var zu = ((es.solid >> 16) & 255) - 32;

			var bmins = vec3.create();
			var bmaxs = vec3.create();

			bmins[0] = bmins[1] = -x;
			bmaxs[0] = bmaxs[1] = x;
			bmins[2] = -zd;
			bmaxs[2] = zu;

			cmodel = cm.TempBoxModel(bmins, bmaxs);
			angles[0] = angles[1] = angles[2] = 0;
			vec3.set(cent.lerpOrigin, origin);
		}

		var trace = cm.TransformedBoxTrace(start, end, mins, maxs, cmodel, mask, origin, angles);

		if (trace.allSolid || trace.fraction < tr.fraction) {
			trace.entityNum = es.number;
			trace.clone(tr);
		} else if (trace.startSolid) {
			tr.startSolid = true;
		}

		if (tr.allSolid) {
			return;
		}
	}
}

/**
 * PointContents
 */
function PointContents(point, passEntityNum) {
	var contents = cm.PointContents(point, 0);

	for (var i = 0; i < cg.numSolidEntities; i++) {
		var cent = cg.solidEntities[i];
		var es = cent.currentState;

		if (es.number === passEntityNum) {
			continue;
		}

		if (es.solid !== SOLID_BMODEL) {  // special value for bmodel
			continue;
		}

		var cmodel = cm.InlineModel(es.modelIndex);
		if (!cmodel) {
			continue;
		}

		contents |= cm.TransformedPointContents(point, cmodel, cent.lerpOrigin, cent.lerpAngles);
	}

	return contents;
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
		var cmd = new QShared.UserCmd();
		var cmdNum = cl.GetCurrentUserCmdNumber();
		cl.GetUserCmd(cmdNum, cmd);
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

	/*i = next.ps.bobCycle;
	if ( i < prev.ps.bobCycle ) {
		i += 256;		// handle wraparound
	}
	out.bobCycle = prev.ps.bobCycle + f * ( i - prev.ps.bobCycle );*/

	for (var i = 0; i < 3; i++) {
		ps.origin[i] = prev.ps.origin[i] + f * (next.ps.origin[i] - prev.ps.origin[i]);
		if (!grabAngles) {
			ps.viewangles[i] = QMath.LerpAngle(prev.ps.viewangles[i], next.ps.viewangles[i], f);
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
	if (cg.snap.ps.pm_flags & PMF.FOLLOW) {
		InterpolatePlayerState(false);
		return;
	}

	if (cg_nopredict()) {
		InterpolatePlayerState(true);
		return;
	}

	// Save the state before the pmove so we can detect transitions.
	var oldPlayerState = cg.predictedPlayerState.clone();

	// If we don't have the commands right after the snapshot, we
	// can't accurately predict a current position, so just freeze at
	// the last good position we had.
	var latest = cl.GetCurrentUserCmdNumber();
	var oldest = latest - CMD_BACKUP + 1;
	var oldestCmd = new QShared.UserCmd();
	cl.GetUserCmd(oldest, oldestCmd);

	// Special check for map_restart.
	if (oldestCmd.serverTime > cg.snap.ps.commandTime && oldestCmd.serverTime < cg.time) {
		if (cg_showmiss()) {
			log('exceeded PACKET_BACKUP on commands'/*, cg.snap.ps.commandTime, oldestCmd.serverTime, cg.time*/);
		}
		return;
	}

	// Get the latest command so we can know which commands are from previous map_restarts.
	var latestCmd = new QShared.UserCmd();
	cl.GetUserCmd(latest, latestCmd);

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

	if (pmove_msec() < 8) {
		pmove_msec(8);
	} else if (pmove_msec() > 33) {
		pmove_msec(33);
	}

	cg.pmove.pmove_fixed = pmove_fixed();
	cg.pmove.pmove_msec = pmove_msec();

	// Prepare for pmove.
	// TODO memset() this thing
	cg.pmove.ps = cg.predictedPlayerState;
	cg.pmove.trace = Trace;
	cg.pmove.pointContents = PointContents;
	if (cg.pmove.ps.pm_type === PM.DEAD) {
		cg.pmove.tracemask = MASK.PLAYERSOLID & ~CONTENTS.BODY;
	} else {
		cg.pmove.tracemask = MASK.PLAYERSOLID;
	}
	if (cg.snap.ps.persistant[PERS.SPECTATOR_STATE] !== SPECTATOR.NOT) {
		cg.pmove.tracemask &= ~CONTENTS.BODY;  // spectators can fly through bodies
	}
	// cg.pmove.noFootsteps = ( cgs.dmflags & DF_NO_FOOTSTEPS ) > 0;

	// Run cmds.
	var moved = false;
	for (var cmdNum = oldest; cmdNum <= latest; cmdNum++) {
		// Get the command.
		cl.GetUserCmd(cmdNum, cg.pmove.cmd);

		if (cg.pmove.pmove_fixed) {
			bg.UpdateViewAngles(cg.pmove.ps, cg.pmove.cmd);
		}

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
		// predict several commands to get to the point we want to compare.
		// if (cg.predictedPlayerState.commandTime === oldPlayerState.commandTime) {
		// 	if (cg.thisFrameTeleport) {
		// 		// A teleport will not cause an error decay
		// 		cg.predictedError = vec3.create();
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
		// 		var delta = vec3.subtract(oldPlayerState.origin, adjusted, vec3.create());
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
		// 				cg.predictedError = vec3.create();
		// 			}
		// 			VectorAdd( delta, cg.predictedError, cg.predictedError );
		// 			cg.predictedErrorTime = cg.oldTime;
		// 		}
		// 	}
		// }

		// Don't predict gauntlet firing, which is only supposed to happen
		// when it actually inflicts damage.
		cg.pmove.gauntletHit = false;

		if (cg.pmove.pmove_fixed) {
			cg.pmove.cmd.serverTime = ((cg.pmove.cmd.serverTime + pmove_msec()-1) / pmove_msec()) * pmove_msec();
		}

		bg.Pmove(cg.pmove);

		moved = true;

		// Add push trigger movement effects
		TouchTriggerPrediction();
	}

	if (cg_showmiss() > 1) {
		log('[' + cg.pmove.cmd.serverTime + ' : ' + cg.time + ']');
	}

	if (!moved) {
		if (cg_showmiss()) {
			log('not moved');
		}
		return;
	}

	// // adjust for the movement of the groundentity
	// CG_AdjustPositionForMover( cg.predictedPlayerState.origin,
	// 	cg.predictedPlayerState.groundEntityNum,
	// 	cg.physicsTime, cg.time, cg.predictedPlayerState.origin, cg.predictedPlayerState.viewangles, cg.predictedPlayerState.viewangles);

	// if (cg_showmiss()) {
	// 	if (cg.predictedPlayerState.eventSequence > oldPlayerState.eventSequence + MAX_PS_EVENTS) {
	// 		CG_Printf("WARNING: dropped event\n");
	// 	}
	// }

	// Fire events and other transition triggered things
	TransitionPlayerState(cg.predictedPlayerState, oldPlayerState);
}


/**
 * TouchTriggerPrediction
 *
 * Predict push triggers and items
 */
function TouchTriggerPrediction() {
	// Dead clients don't activate triggers.
	if (cg.predictedPlayerState.pm_type === PM.DEAD) {
		return;
	}

	var spectator = (cg.predictedPlayerState.pm_type === PM.SPECTATOR);
	if (cg.predictedPlayerState.pm_type !== PM.NORMAL && !spectator) {
		return;
	}

	for (var i = 0; i < cg.numTriggerEntities; i++) {
		var cent = cg.triggerEntities[i];
		var es = cent.currentState;

		if (es.eType === ET.ITEM && !spectator) {
			TouchItem(cent);
			continue;
		}

		if (es.solid !== SOLID_BMODEL) {
			continue;
		}

		var cmodel = cm.InlineModel(es.modelIndex);
		if (!cmodel) {
			continue;
		}

		var trace = cm.BoxTrace(cg.predictedPlayerState.origin, cg.predictedPlayerState.origin,
			cg.pmove.mins, cg.pmove.maxs, cmodel, -1);

		if (!trace.startSolid) {
			continue;
		}

		if (es.eType === ET.TELEPORT_TRIGGER) {
			cg.hyperspace = true;
		} else if (es.eType == ET.PUSH_TRIGGER) {
			bg.TouchJumpPad(cg.predictedPlayerState, es);
		}
	}

	// If we didn't touch a jump pad this pmove frame.
	if (cg.predictedPlayerState.jumppad_frame != cg.predictedPlayerState.pmove_framecount) {
		cg.predictedPlayerState.jumppad_frame = 0;
		cg.predictedPlayerState.jumppad_ent = 0;
	}
}

/**
 * TouchItem
 */
function TouchItem(cent) {
	// if (!cg_predictItems()) {
	// 	return;
	// }

	if (!bg.PlayerTouchesItem(cg.predictedPlayerState, cent.currentState, cg.time)) {
		return;
	}

	// Never pick an item up twice in a prediction.
	if (cent.miscTime === cg.time) {
		return;
	}

	if (!bg.CanItemBeGrabbed(null/*cgs.gametype*/, cent.currentState, cg.predictedPlayerState)) {
		return;  // can't hold it
	}

	var item = bg.ItemList[cent.currentState.modelIndex];

	// Special case for flags.
	// We don't predict touching our own flag.
	if (cgs.gametype === GT.CTF) {
		if (cg.predictedPlayerState.persistant[PERS.TEAM] == TEAM.RED && item.giTag == PW.REDFLAG) {
			return;
		}
		if (cg.predictedPlayerState.persistant[PERS.TEAM] == TEAM.BLUE && item.giTag == PW.BLUEFLAG) {
			return;
		}
	}

	// Grab it.
	bg.AddPredictableEventToPlayerstate(cg.predictedPlayerState, EV.ITEM_PICKUP, cent.currentState.modelIndex);

	// Remove it from the frame so it won't be drawn.
	cent.currentState.eFlags |= EF.NODRAW;

	// Don't touch it again this prediction.
	cent.miscTime = cg.time;

	// If it's a weapon, give them some predicted ammo so the autoswitch will work.
	if (item.giType === IT.WEAPON) {
		cg.predictedPlayerState.stats[STAT.WEAPONS] |= 1 << item.giTag;
		if (!cg.predictedPlayerState.ammo[item.giTag]) {
			cg.predictedPlayerState.ammo[item.giTag] = 1;
		}
	}
}

