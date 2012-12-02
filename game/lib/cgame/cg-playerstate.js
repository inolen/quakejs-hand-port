/**
 * TransitionPlayerState
 */
function TransitionPlayerState(ps, ops) {
	// Check for changing follow mode.
	/*if (ps.clientNum !== ops.clientNum) {
		cg.thisFrameTeleport = qtrue;
		// make sure we don't get any unwanted transition effects
		*ops = *ps;
	}*/

	// Damage events (player is getting wounded).
	/*if ( ps.damageEvent != ops.damageEvent && ps.damageCount ) {
		CG_DamageFeedback( ps.damageYaw, ps.damagePitch, ps.damageCount );
	}*/

	// Respawning.
	if (ps.persistant[PERS.SPAWN_COUNT] != ops.persistant[PERS.SPAWN_COUNT] ) {
		Respawn();
	}

	/*if ( cg.mapRestart ) {
		CG_Respawn();
		cg.mapRestart = qfalse;
	}*/

	if (cg.snap.ps.pm_type !== PM.INTERMISSION 
		&& ps.persistant[PERS.TEAM] !== TEAM.SPECTATOR) {
		CheckLocalSounds(ps, ops);
	}

	// check for going low on ammo
	//CG_CheckAmmo();

	// Run events.
	CheckPlayerstateEvents(ps, ops);

	/*// smooth the ducking viewheight change
	if ( ps.viewheight != ops.viewheight ) {
		cg.duckChange = ps.viewheight - ops.viewheight;
		cg.duckTime = cg.time;
	}*/
}

/**
 * CheckLocalSounds
 */
function CheckLocalSounds(ps, ops) {
	// Don't play the sounds if the player just changed teams.
	if (ps.persistant[PERS.TEAM] != ops.persistant[PERS.TEAM]) {
		return;
	}

	// Hit changes.
	if (ps.persistant[PERS.HITS] > ops.persistant[PERS.HITS]) {
		snd.StartLocalSound(cgs.media.hitSound/*, CHAN_LOCAL_SOUND*/);
	} else if ( ps.persistant[PERS.HITS] < ops.persistant[PERS.HITS] ) {
		snd.StartLocalSound(cgs.media.hitTeamSound/*, CHAN_LOCAL_SOUND*/);
	}

	// Health changes of more than -1 should make pain sounds.
	if (ps.stats[STAT.HEALTH] < ops.stats[STAT.HEALTH] - 1) {
		if (ps.stats[STAT.HEALTH] > 0) {
			PainEvent(cg.predictedPlayerEntity, ps.stats[STAT.HEALTH]);
		}
	}

	// // If we are going into the intermission, don't start any voices.
	// if (cg.intermissionStarted) {
	// 	return;
	// }

	// // reward sounds
	// reward = qfalse;
	// if (ps.persistant[PERS.CAPTURES] != ops.persistant[PERS.CAPTURES]) {
	// 	pushReward(cgs.media.captureAwardSound, cgs.media.medalCapture, ps.persistant[PERS.CAPTURES]);
	// 	reward = qtrue;
	// 	//Com_Printf("capture\n");
	// }
	// if (ps.persistant[PERS.IMPRESSIVE_COUNT] != ops.persistant[PERS.IMPRESSIVE_COUNT]) {
	// 	sfx = cgs.media.impressiveSound;
	// 	pushReward(sfx, cgs.media.medalImpressive, ps.persistant[PERS.IMPRESSIVE_COUNT]);
	// 	reward = qtrue;
	// 	//Com_Printf("impressive\n");
	// }
	// if (ps.persistant[PERS.EXCELLENT_COUNT] != ops.persistant[PERS.EXCELLENT_COUNT]) {
	// 	sfx = cgs.media.excellentSound;
	// 	pushReward(sfx, cgs.media.medalExcellent, ps.persistant[PERS.EXCELLENT_COUNT]);
	// 	reward = qtrue;
	// 	//Com_Printf("excellent\n");
	// }
	// if (ps.persistant[PERS.GAUNTLET_FRAG_COUNT] != ops.persistant[PERS.GAUNTLET_FRAG_COUNT]) {
	// 	sfx = cgs.media.humiliationSound;
	// 	pushReward(sfx, cgs.media.medalGauntlet, ps.persistant[PERS.GAUNTLET_FRAG_COUNT]);
	// 	reward = qtrue;
	// 	//Com_Printf("guantlet frag\n");
	// }
	// if (ps.persistant[PERS.DEFEND_COUNT] != ops.persistant[PERS.DEFEND_COUNT]) {
	// 	pushReward(cgs.media.defendSound, cgs.media.medalDefend, ps.persistant[PERS.DEFEND_COUNT]);
	// 	reward = qtrue;
	// 	//Com_Printf("defend\n");
	// }
	// if (ps.persistant[PERS.ASSIST_COUNT] != ops.persistant[PERS.ASSIST_COUNT]) {
	// 	pushReward(cgs.media.assistSound, cgs.media.medalAssist, ps.persistant[PERS.ASSIST_COUNT]);
	// 	reward = qtrue;
	// 	//Com_Printf("assist\n");
	// }
	// // if any of the player event bits changed
	// if (ps.persistant[PERS.PLAYEREVENTS] != ops.persistant[PERS.PLAYEREVENTS]) {
	// 	if ((ps.persistant[PERS.PLAYEREVENTS] & PLAYEREVENT_DENIEDREWARD) !=
	// 			(ops.persistant[PERS.PLAYEREVENTS] & PLAYEREVENT_DENIEDREWARD)) {
	// 		trap_S_StartLocalSound( cgs.media.deniedSound, CHAN_ANNOUNCER );
	// 	}
	// 	else if ((ps.persistant[PERS.PLAYEREVENTS] & PLAYEREVENT_GAUNTLETREWARD) !=
	// 			(ops.persistant[PERS.PLAYEREVENTS] & PLAYEREVENT_GAUNTLETREWARD)) {
	// 		trap_S_StartLocalSound( cgs.media.humiliationSound, CHAN_ANNOUNCER );
	// 	}
	// 	else if ((ps.persistant[PERS.PLAYEREVENTS] & PLAYEREVENT_HOLYSHIT) !=
	// 			(ops.persistant[PERS.PLAYEREVENTS] & PLAYEREVENT_HOLYSHIT)) {
	// 		trap_S_StartLocalSound( cgs.media.holyShitSound, CHAN_ANNOUNCER );
	// 	}
	// 	reward = qtrue;
	// }

	// // check for flag pickup
	// if ( cgs.gametype > GT_TEAM ) {
	// 	if ((ps.powerups[PW_REDFLAG] != ops.powerups[PW_REDFLAG] && ps.powerups[PW_REDFLAG]) ||
	// 		(ps.powerups[PW_BLUEFLAG] != ops.powerups[PW_BLUEFLAG] && ps.powerups[PW_BLUEFLAG]) ||
	// 		(ps.powerups[PW_NEUTRALFLAG] != ops.powerups[PW_NEUTRALFLAG] && ps.powerups[PW_NEUTRALFLAG]) )
	// 	{
	// 		trap_S_StartLocalSound( cgs.media.youHaveFlagSound, CHAN_ANNOUNCER );
	// 	}
	// }

	// // lead changes
	// if (!reward) {
	// 	//
	// 	if ( !cg.warmup ) {
	// 		// never play lead changes during warmup
	// 		if ( ps.persistant[PERS.RANK] != ops.persistant[PERS.RANK] ) {
	// 			if ( cgs.gametype < GT_TEAM) {
	// 				if (  ps.persistant[PERS.RANK] == 0 ) {
	// 					CG_AddBufferedSound(cgs.media.takenLeadSound);
	// 				} else if ( ps.persistant[PERS.RANK] == RANK_TIED_FLAG ) {
	// 					CG_AddBufferedSound(cgs.media.tiedLeadSound);
	// 				} else if ( ( ops.persistant[PERS.RANK] & ~RANK_TIED_FLAG ) == 0 ) {
	// 					CG_AddBufferedSound(cgs.media.lostLeadSound);
	// 				}
	// 			}
	// 		}
	// 	}
	// }

	// // timelimit warnings
	// if ( cgs.timelimit > 0 ) {
	// 	int		msec;

	// 	msec = cg.time - cgs.levelStartTime;
	// 	if ( !( cg.timelimitWarnings & 4 ) && msec > ( cgs.timelimit * 60 + 2 ) * 1000 ) {
	// 		cg.timelimitWarnings |= 1 | 2 | 4;
	// 		trap_S_StartLocalSound( cgs.media.suddenDeathSound, CHAN_ANNOUNCER );
	// 	}
	// 	else if ( !( cg.timelimitWarnings & 2 ) && msec > (cgs.timelimit - 1) * 60 * 1000 ) {
	// 		cg.timelimitWarnings |= 1 | 2;
	// 		trap_S_StartLocalSound( cgs.media.oneMinuteSound, CHAN_ANNOUNCER );
	// 	}
	// 	else if ( cgs.timelimit > 5 && !( cg.timelimitWarnings & 1 ) && msec > (cgs.timelimit - 5) * 60 * 1000 ) {
	// 		cg.timelimitWarnings |= 1;
	// 		trap_S_StartLocalSound( cgs.media.fiveMinuteSound, CHAN_ANNOUNCER );
	// 	}
	// }

	// // fraglimit warnings
	// if ( cgs.fraglimit > 0 && cgs.gametype < GT_CTF) {
	// 	highScore = cgs.scores1;

	// 	if (cgs.gametype == GT_TEAM && cgs.scores2 > highScore) {
	// 		highScore = cgs.scores2;
	// 	}

	// 	if ( !( cg.fraglimitWarnings & 4 ) && highScore == (cgs.fraglimit - 1) ) {
	// 		cg.fraglimitWarnings |= 1 | 2 | 4;
	// 		CG_AddBufferedSound(cgs.media.oneFragSound);
	// 	}
	// 	else if ( cgs.fraglimit > 2 && !( cg.fraglimitWarnings & 2 ) && highScore == (cgs.fraglimit - 2) ) {
	// 		cg.fraglimitWarnings |= 1 | 2;
	// 		CG_AddBufferedSound(cgs.media.twoFragSound);
	// 	}
	// 	else if ( cgs.fraglimit > 3 && !( cg.fraglimitWarnings & 1 ) && highScore == (cgs.fraglimit - 3) ) {
	// 		cg.fraglimitWarnings |= 1;
	// 		CG_AddBufferedSound(cgs.media.threeFragSound);
	// 	}
	// }
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
		// If we have a new predictable event.
		if (i >= ops.eventSequence
			// or the server told us to play another event instead of a predicted event we already issued
			// or something the server told us changed our prediction causing a different event
			|| (i > ops.eventSequence - MAX_PS_EVENTS && ps.events[i & (MAX_PS_EVENTS - 1)] !== ops.events[i & (MAX_PS_EVENTS - 1)]) ) {
			cent.currentState.event = ps.events[i & (MAX_PS_EVENTS - 1)];
			cent.currentState.eventParm = ps.eventParms[i & (MAX_PS_EVENTS - 1)];
			AddEntityEvent(cent, cent.lerpOrigin);
		}
	}
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