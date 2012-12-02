/**
 * AddPredictableEventToPlayerstate
 *
 * Handles the sequence numbers.
 */
function AddPredictableEventToPlayerstate(ps, newEvent, eventParm) {
	ps.events[ps.eventSequence & (MAX_PS_EVENTS - 1)] = newEvent;
	ps.eventParms[ps.eventSequence & (MAX_PS_EVENTS - 1)] = eventParm;
	ps.eventSequence++;
}

/**
 * PlayerStateToEntityState
 *
 * This is done after each set of usercmd_t on the server,
 * and after local prediction on the client
 */
function PlayerStateToEntityState(ps, es) {
	/*if (ps.pm_type === PM.INTERMISSION || ps.pm_type === PM.SPECTATOR) {
		es.eType = ET.INVISIBLE;
	} else if ( ps.stats[STAT.HEALTH] <= GIB_HEALTH ) {
		es.eType = ET.INVISIBLE;
	} else {
		es.eType = ET.PLAYER;
	}*/

	es.number = ps.clientNum;
	es.eType = ET.PLAYER;

	es.pos.trType = TR.INTERPOLATE;
	vec3.set(ps.origin, es.pos.trBase);
	vec3.set(ps.velocity, es.pos.trDelta);

	es.apos.trType = TR.INTERPOLATE;
	vec3.set(ps.viewangles, es.apos.trBase);

	es.angles2[QMath.YAW] = ps.movementDir;
	es.legsAnim = ps.legsAnim;
	es.torsoAnim = ps.torsoAnim;
	es.clientNum = ps.clientNum;                  // ET_PLAYER looks here instead of at number
	                                              // so corpses can also reference the proper config
	es.eFlags = ps.eFlags;
	if (ps.stats[STAT.HEALTH] <= 0) {
		es.eFlags |= EF.DEAD;
	} else {
		es.eFlags &= ~EF.DEAD;
	}

	if (ps.externalEvent) {
		es.event = ps.externalEvent;
		es.eventParm = ps.externalEventParm;
	} else if (ps.entityEventSequence < ps.eventSequence) {
		if (ps.entityEventSequence < ps.eventSequence - MAX_PS_EVENTS) {
			ps.entityEventSequence = ps.eventSequence - MAX_PS_EVENTS;
		}
		var seq = ps.entityEventSequence & (MAX_PS_EVENTS - 1);
		es.event = ps.events[seq] | ((ps.entityEventSequence & 3) << 8);
		es.eventParm = ps.eventParms[seq];
		ps.entityEventSequence++;
	}

	es.weapon = ps.weapon;
	es.groundEntityNum = ps.groundEntityNum;

	es.powerups = 0;
	for (var i = 0; i < MAX_POWERUPS; i++) {
		if (ps.powerups[i]) {
			es.powerups |= 1 << i;
		}
	}

	es.loopSound = ps.loopSound;
	es.generic1 = ps.generic1;
}

/**
 * EvaluateTrajectory
 */
function EvaluateTrajectory(tr, atTime, result) {
	var deltaTime;
	var phase;

	switch (tr.trType) {
		case TR.STATIONARY:
		case TR.INTERPOLATE:
			vec3.set(tr.trBase, result);
			break;

		case TR.LINEAR:
			deltaTime = (atTime - tr.trTime) * 0.001;  // milliseconds to seconds
			vec3.add(tr.trBase, vec3.scale(tr.trDelta, deltaTime, [0, 0, 0]), result);
			break;

		case TR.SINE:
			deltaTime = (atTime - tr.trTime) / tr.trDuration;
			phase = Math.sin(deltaTime * Math.PI * 2);
			vec3.add(tr.trBase, vec3.scale(tr.trDelta, phase, [0, 0, 0]), result);
			break;

		case TR.LINEAR_STOP:
			if (atTime > tr.trTime + tr.trDuration) {
				atTime = tr.trTime + tr.trDuration;
			}
			deltaTime = (atTime - tr.trTime) * 0.001;  // milliseconds to seconds
			if (deltaTime < 0) {
				deltaTime = 0;
			}
			vec3.add(tr.trBase, vec3.scale(tr.trDelta, deltaTime, [0, 0, 0]), result);
			break;
		case TR.GRAVITY:
			deltaTime = (atTime - tr.trTime) * 0.001;  // milliseconds to seconds
			vec3.add(tr.trBase, vec3.scale(tr.trDelta, deltaTime, [0, 0, 0]), result);
			result[2] -= 0.5 * DEFAULT_GRAVITY * deltaTime * deltaTime;  // FIXME: local gravity...
			break;
		default:
			com.error(ERR.DROP, 'EvaluateTrajectory: unknown trType: ' + tr.trType);
			break;
	}
}

/**
 * EvaluateTrajectoryDelta
 * 
 * For determining velocity at a given time
 */
function EvaluateTrajectoryDelta(tr, atTime, result) {
	var deltaTime;
	var phase;

	switch (tr.trType) {
		case TR.STATIONARY:
		case TR.INTERPOLATE:
			result[0] = result[1] = result[2] = 0;
			break;
		case TR.LINEAR:
			vec3.set(tr.trDelta, result);
			break;
		case TR.SINE:
			deltaTime = (atTime - tr.trTime) / tr.trDuration;
			phase = Math.cos(deltaTime * Math.PI * 2);  // derivative of sin = cos
			phase *= 0.5;
			vec3.scale(tr.trDelta, phase, result);
			break;
		case TR.LINEAR_STOP:
			if (atTime > tr.trTime + tr.trDuration) {
				result[0] = result[1] = result[2] = 0;
				return;
			}
			vec3.set(tr.trDelta, result);
			break;
		case TR.GRAVITY:
			deltaTime = (atTime - tr.trTime) * 0.001;  // milliseconds to seconds
			vec3.set(tr.trDelta, result);
			result[2] -= DEFAULT_GRAVITY * deltaTime;  // FIXME: local gravity...
			break;
		default:
			com.error(ERR.DROP, 'EvaluateTrajectoryDelta: unknown trType: ' + tr.trType);
			break;
	}
}

/**
 * TouchJumpPad
 */
function TouchJumpPad(ps, jumppad) {
	// Spectators don't use jump pads.
	if (ps.pm_type !== PM.NORMAL) {
		return;
	}

	// Flying characters don't hit bounce pads.
	if (ps.powerups[PW.FLIGHT]) {
		return;
	}

	// If we didn't hit this same jumppad the previous frame
	// then don't play the event sound again if we are in a fat trigger
	if (ps.jumppad_ent !== jumppad.number) {
		var angles = [0, 0, 0];
		QMath.VectorToAngles(jumppad.origin2, angles);

		var p = Math.abs(QMath.AngleNormalize180(angles[QMath.PITCH]));
		var effectNum = p < 45 ? 0 : 1;

		AddPredictableEventToPlayerstate(ps, EV.JUMP_PAD, effectNum);
	}

	// remember hitting this jumppad this frame
	ps.jumppad_ent = jumppad.number;
	ps.jumppad_frame = ps.pmove_framecount;

	// give the player the velocity from the jumppad
	vec3.set(jumppad.origin2, ps.velocity);
}

/**
 * CanItemBeGrabbed
 *
 * Returns false if the item should not be picked up.
 * This needs to be the same for client side prediction and server use.
 */
function CanItemBeGrabbed(gametype, ent, ps) {
	// TODO Why is this crashing
	// if (ent.modelIndex < 1 || ent.modelIndex >= itemList.length) {
	// 	throw new Error('CanItemBeGrabbed: index out of range'); /* ERR_DROPPED */
	// }
	
	var item = itemList[ent.modelIndex];
	
	switch (item.giType) {
		case IT.WEAPON:
			return true;	// weapons are always picked up
		
		case IT.AMMO:
			if (ps.ammo[ item.giTag ] >= 200) {
				return false;		// can't hold any more
			}
			return true;
		
		case IT.ARMOR:
			if (ps.stats[STAT.ARMOR] >= ps.stats[STAT.MAX_HEALTH] * 2) {
				return false;
			}
			
			return true;
		
		case IT.HEALTH:
			// Small and mega healths will go over the max, otherwise
			// don't pick up if already at max.
			if (item.quantity == 5 || item.quantity == 100) {
				if (ps.stats[STAT.HEALTH] >= ps.stats[STAT.MAX_HEALTH] * 2) {
					return false;
				}
				
				return true;
			}			
			if (ps.stats[STAT.HEALTH] >= ps.stats[STAT.MAX_HEALTH]) {
				return false;
			}
			return true;
		
		case IT.POWERUP:
			return true;	// powerups are always picked up
		
	// 	case IT.TEAM: // team items, such as flags
	// 		if( gametype == GT.CTF ) {
	// 			// ent.modelIndex2 is non-zero on items if they are dropped
	// 			// we need to know this because we can pick up our dropped flag (and return it)
	// 			// but we can't pick up our flag at base
	// 			if (ps.persistant[PERS.TEAM] == TEAM_RED) {
	// 				if (item.giTag == PW_BLUEFLAG ||
	// 					(item.giTag == PW_REDFLAG && ent.modelIndex2) ||
	// 					(item.giTag == PW_REDFLAG && ps.powerups[PW_BLUEFLAG]) )
	// 					return true;
	// 			} else if (ps.persistant[PERS.TEAM] == TEAM_BLUE) {
	// 				if (item.giTag == PW_REDFLAG ||
	// 					(item.giTag == PW_BLUEFLAG && ent.modelIndex2) ||
	// 					(item.giTag == PW_BLUEFLAG && ps.powerups[PW_REDFLAG]) )
	// 					return true;
	// 			}
	// 		}
	// 
	// 		return false;
		
		case IT.HOLDABLE:
			// Can only hold one item at a time
			if (ps.stats[STAT.HOLDABLE_ITEM]) {
				return false;
			}
			return true;
		
	// 	case IT.BAD:
	// 		log( ERR_DROP, "BG_CanItemBeGrabbed: IT_BAD" );
		
		default:
			break;
	}
	
	return false;
}

/**
 * PlayerTouchesItem
 *  
 * Items can be picked up without actually touching their physical bounds to make
 * grabbing them easier.
 */
function PlayerTouchesItem(ps, item, atTime) {
	var origin = [0, 0, 0];

	EvaluateTrajectory(item.pos, atTime, origin);

	// We are ignoring ducked differences here.
	if (ps.origin[0] - origin[0] > 44 ||
		ps.origin[0] - origin[0] < -50 ||
		ps.origin[1] - origin[1] > 36 ||
		ps.origin[1] - origin[1] < -36 ||
		ps.origin[2] - origin[2] > 36 ||
		ps.origin[2] - origin[2] < -36) {
		return false;
	}

	return true;
}