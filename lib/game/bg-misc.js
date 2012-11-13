/**
 * AddPredictableEventToPlayerstate
 *
 * Handles the sequence numbers.
 */
function AddPredictableEventToPlayerstate(ps, newEvent, eventParm) {	
	ps.events[ps.eventSequence % MAX_PS_EVENTS] = newEvent;
	ps.eventParms[ps.eventSequence % MAX_PS_EVENTS] = eventParm;
	ps.eventSequence++;
}

/**
 * PlayerStateToEntityState
 *
 * This is done after each set of usercmd_t on the server,
 * and after local prediction on the client
 */
function PlayerStateToEntityState(ps, state) {
	/*if (ps.pm_type === PM_INTERMISSION || ps->pm_type === PM_SPECTATOR) {
		state.eType = ET.INVISIBLE;
	} else if ( ps.stats[STAT_HEALTH] <= GIB_HEALTH ) {
		state.eType = ET.INVISIBLE;
	} else {
		state.eType = ET.PLAYER;
	}*/

	state.number = ps.clientNum;
	state.eType = ET.PLAYER;

	state.pos.trType = sh.TrajectoryType.INTERPOLATE;
	vec3.set(ps.origin, state.pos.trBase);
	vec3.set(ps.velocity, state.pos.trDelta);

	state.apos.trType = sh.TrajectoryType.INTERPOLATE;
	vec3.set(ps.viewangles, state.apos.trBase);

	state.angles2[qm.YAW] = ps.movementDir;
	state.legsAnim = ps.legsAnim;
	state.torsoAnim = ps.torsoAnim;
	state.clientNum = ps.clientNum;                  // ET_PLAYER looks here instead of at number
	                                             // so corpses can also reference the proper config
	state.eFlags = ps.eFlags;
	/*if ( ps->stats[STAT_HEALTH] <= 0 ) {
		s->eFlags |= EF.DEAD;
	} else {
		s->eFlags &= ~EF.DEAD;
	}*/

	/*if ( ps->externalEvent ) {
		s->event = ps->externalEvent;
		s->eventParm = ps->externalEventParm;
	} else if ( ps->entityEventSequence < ps->eventSequence ) {
		int		seq;

		if ( ps->entityEventSequence < ps->eventSequence - MAX_PS_EVENTS) {
			ps->entityEventSequence = ps->eventSequence - MAX_PS_EVENTS;
		}
		seq = ps->entityEventSequence & (MAX_PS_EVENTS-1);
		s->event = ps->events[ seq ] | ( ( ps->entityEventSequence & 3 ) << 8 );
		s->eventParm = ps->eventParms[ seq ];
		ps->entityEventSequence++;
	}*/

	state.weapon = ps.weapon;
	state.groundEntityNum = ps.groundEntityNum;

	/*s->powerups = 0;
	for ( i = 0 ; i < MAX_POWERUPS ; i++ ) {
		if ( ps->powerups[ i ] ) {
			s->powerups |= 1 << i;
		}
	}

	s->loopSound = ps->loopSound;
	s->generic1 = ps->generic1;*/
}

/**
 * EvaluateTrajectory
 */
function EvaluateTrajectory(tr, atTime, result) {
	var deltaTime;
	var phase;

	switch (tr.trType) {
		case sh.TrajectoryType.STATIONARY:
		case sh.TrajectoryType.INTERPOLATE:
			vec3.set(tr.trBase, result);
			break;

		case sh.TrajectoryType.LINEAR:
			deltaTime = (atTime - tr.trTime) * 0.001;  // milliseconds to seconds
			vec3.add(tr.trBase, vec3.scale(tr.trDelta, deltaTime), result);
			break;

		case sh.TrajectoryType.SINE:
			deltaTime = (atTime - tr.trTime) / tr.trDuration;
			phase = Math.sin(deltaTime * Math.PI * 2);
			vec3.add(tr.trBase, phase, tr.trDelta, result);
			break;

		case sh.TrajectoryType.LINEAR_STOP:
			if (atTime > tr.trTime + tr.trDuration) {
				atTime = tr.trTime + tr.trDuration;
			}
			deltaTime = (atTime - tr.trTime) * 0.001;  // milliseconds to seconds
			if (deltaTime < 0) {
				deltaTime = 0;
			}
			vec3.add(tr.trBase, vec3.scale(tr.trDelta, deltaTime), result);
			break;
		case sh.TrajectoryType.GRAVITY:
			deltaTime = (atTime - tr.trTime) * 0.001;  // milliseconds to seconds
			vec3.add(tr.trBase, vec3.scale(tr.trDelta, deltaTime), result);
			result[2] -= 0.5 * DEFAULT_GRAVITY * deltaTime * deltaTime;  // FIXME: local gravity...
			break;
		default:
			com.error(sh.Err.DROP, 'EvaluateTrajectory: unknown trType: ' + tr.trType);
	}
}

/**
 * TouchJumpPad
 */
function TouchJumpPad(ps, jumppad) {
	// If we didn't hit this same jumppad the previous frame
	// then don't play the event sound again if we are in a fat trigger
	/*if (ps.jumppad_ent !== jumppad.number) {		
		vectoangles( jumppad->origin2, angles);
		p = fabs( AngleNormalize180( angles[qm.PITCH] ) );
		if( p < 45 ) {
			effectNum = 0;
		} else {
			effectNum = 1;
		}
		BG_AddPredictableEventToPlayerstate( EV_JUMP_PAD, effectNum, ps );
	}*/
	// remember hitting this jumppad this frame
	ps.jumppad_ent = jumppad.number;
	ps.jumppad_frame = ps.pmove_framecount;

	// give the player the velocity from the jumppad
	vec3.set(jumppad.origin2, ps.velocity);
}