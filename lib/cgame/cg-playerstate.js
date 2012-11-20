/**
 * TransitionPlayerState
 */
function TransitionPlayerState(ps, ops) {
	// check for changing follow mode
	/*if (ps.clientNum !== ops.clientNum) {
		cg.thisFrameTeleport = qtrue;
		// make sure we don't get any unwanted transition effects
		*ops = *ps;
	}*/

	// damage events (player is getting wounded)
	/*if ( ps->damageEvent != ops->damageEvent && ps->damageCount ) {
		CG_DamageFeedback( ps->damageYaw, ps->damagePitch, ps->damageCount );
	}*/

	// Respawning.
	if (ps.persistant[PERS.SPAWN_COUNT] != ops.persistant[PERS.SPAWN_COUNT] ) {
		Respawn();
	}

	/*if ( cg.mapRestart ) {
		CG_Respawn();
		cg.mapRestart = qfalse;
	}*/

	/*if ( cg.snap->ps.pm_type != PM_INTERMISSION 
		&& ps->persistant[PERS_TEAM] != TEAM_SPECTATOR ) {
		CG_CheckLocalSounds( ps, ops );
	}*/

	// check for going low on ammo
	//CG_CheckAmmo();

	// Run events.
	CheckPlayerstateEvents(ps, ops);

	/*// smooth the ducking viewheight change
	if ( ps->viewheight != ops->viewheight ) {
		cg.duckChange = ps->viewheight - ops->viewheight;
		cg.duckTime = cg.time;
	}*/
}

/**
 * Respawn
 * 
 * A respawn happened this snapshot
 */
function Respawn() {
	// No error decay on player movement.
	cg.thisFrameTeleport = true;

	// Display weapons available.
	//cg.weaponSelectTime = cg.time;

	// Select the weapon the server says we are using.
	cg.weaponSelect = cg.snap.ps.weapon;
}

/**
 * CheckPlayerstateEvents
 */
function CheckPlayerstateEvents(ps, ops) {
	var cent;
	if (ps.externalEvent && ps.externalEvent != ops.externalEvent) {
		cent = cg.entities[ps.clientNum];
		cent.currentState.event = ps.externalEvent;
		cent.currentState.eventParm = ps.externalEventParm;
		AddEntityEvent(cent, cent.lerpOrigin);
	}

	cent = cg.predictedPlayerEntity;
	// Go through the predictable events buffer.
	for (var i = ps.eventSequence - MAX_PS_EVENTS; i < ps.eventSequence; i++) {
		// If we have a new predictable event
		if (i >= ops.eventSequence
			// or the server told us to play another event instead of a predicted event we already issued
			// or something the server told us changed our prediction causing a different event
			|| (i > ops.eventSequence - MAX_PS_EVENTS && ps.events[i % MAX_PS_EVENTS] != ops.events[i % MAX_PS_EVENTS]) ) {
			var event = ps.events[i % MAX_PS_EVENTS];
			cent.currentState.event = event;
			cent.currentState.eventParm = ps.eventParms[i % MAX_PS_EVENTS];
			AddEntityEvent(cent, cent.lerpOrigin);

			cg.predictableEvents[i % MAX_PREDICTED_EVENTS] = event;
			cg.eventSequence++;
		}
	}
}