/**
 * TransitionPlayerState
 */
function TransitionPlayerState(ps, ops) {
	// Check for changing follow mode.
	if (ps.clientNum !== ops.clientNum) {
		cg.thisFrameTeleport = true;

		// Make sure we don't get any unwanted transition effects.
		ps.clone(ops);
	}

	// Damage events (player is getting wounded).
	// if (ps.damageEvent !== ops.damageEvent && ps.damageCount) {
	// 	CG_DamageFeedback(ps.damageYaw, ps.damagePitch, ps.damageCount);
	// }

	// Update warmup immediately after changing arena.
	if (ps.arenaNum !== ops.arenaNum) {
		ArenaChanged();
	}

	// Respawning.
	if (ps.persistant[PERS.SPAWN_COUNT] !== ops.persistant[PERS.SPAWN_COUNT] ) {
		Respawn();
	}

	if (cg.mapRestart) {
		Respawn();
		cg.mapRestart = false;
	}

	if (ps.pm_type !== PM.INTERMISSION && ps.pm_type !== PM.SPECTATOR) {
		CheckLocalSounds(ps, ops);
	}

	// // Check for going low on ammo.
	// CG_CheckAmmo();

	// Run events.
	CheckPlayerstateEvents(ps, ops);

	// Smooth the ducking viewheight change.
	if (ps.viewheight != ops.viewheight) {
		cg.duckChange = ps.viewheight - ops.viewheight;
		cg.duckTime = cg.time;
	}
}

/**
 * CheckLocalSounds
 */
function CheckLocalSounds(ps, ops) {
	var arena = cgs.arenas[ps.arenaNum];

	// Don't play the sounds if the player just changed teams.
	if (ps.persistant[PERS.TEAM] !== ops.persistant[PERS.TEAM]) {
		return;
	}

	// Hit changes.
	if (ps.persistant[PERS.HITS] > ops.persistant[PERS.HITS]) {
		SND.StartLocalSound(cgs.media.hitSound/*, CHAN_LOCAL_SOUND*/);
	} else if ( ps.persistant[PERS.HITS] < ops.persistant[PERS.HITS] ) {
		SND.StartLocalSound(cgs.media.hitTeamSound/*, CHAN_LOCAL_SOUND*/);
	}

	// Health changes of more than -1 should make pain sounds.
	if (ps.stats[STAT.HEALTH] < ops.stats[STAT.HEALTH] - 1) {
		if (ps.stats[STAT.HEALTH] > 0) {
			PainEvent(cg.predictedPlayerEntity, ps.stats[STAT.HEALTH]);
		}
	}

	// If we are going into the intermission, don't start any voices.
	if (cg.intermissionStarted) {
		return;
	}

	// Reward sounds.
	var reward = false;
	if (ps.persistant[PERS.CAPTURES] !== ops.persistant[PERS.CAPTURES]) {
		pushReward(cgs.media.captureAwardSound, cgs.media.medalCaptureImage, ps.persistant[PERS.CAPTURES]);
		reward = true;
	}
	if (ps.persistant[PERS.IMPRESSIVE_COUNT] !== ops.persistant[PERS.IMPRESSIVE_COUNT]) {
		pushReward(cgs.media.impressiveSound, cgs.media.medalImpressiveImage, ps.persistant[PERS.IMPRESSIVE_COUNT]);
		reward = true;
	}
	if (ps.persistant[PERS.EXCELLENT_COUNT] !== ops.persistant[PERS.EXCELLENT_COUNT]) {
		pushReward(cgs.media.excellentSound, cgs.media.medalExcellentImage, ps.persistant[PERS.EXCELLENT_COUNT]);
		reward = true;
	}
	if (ps.persistant[PERS.GAUNTLET_FRAG_COUNT] !== ops.persistant[PERS.GAUNTLET_FRAG_COUNT]) {
		pushReward(cgs.media.humiliationSound, cgs.media.medalGauntletImage, ps.persistant[PERS.GAUNTLET_FRAG_COUNT]);
		reward = true;
	}
	if (ps.persistant[PERS.DEFEND_COUNT] !== ops.persistant[PERS.DEFEND_COUNT]) {
		pushReward(cgs.media.defendSound, cgs.media.medalDefendImage, ps.persistant[PERS.DEFEND_COUNT]);
		reward = true;
	}
	if (ps.persistant[PERS.ASSIST_COUNT] !== ops.persistant[PERS.ASSIST_COUNT]) {
		pushReward(cgs.media.assistSound, cgs.media.medalAssistImage, ps.persistant[PERS.ASSIST_COUNT]);
		reward = true;
	}

	// If any of the player event bits changed.
	if (ps.persistant[PERS.PLAYEREVENTS] !== ops.persistant[PERS.PLAYEREVENTS]) {
		if ((ps.persistant[PERS.PLAYEREVENTS] & PLAYEREVENTS.DENIEDREWARD) !=
				(ops.persistant[PERS.PLAYEREVENTS] & PLAYEREVENTS.DENIEDREWARD)) {
			SND.StartLocalSound(cgs.media.deniedSound/*, CHAN_ANNOUNCER*/);
		}
		else if ((ps.persistant[PERS.PLAYEREVENTS] & PLAYEREVENTS.GAUNTLETREWARD) !=
				(ops.persistant[PERS.PLAYEREVENTS] & PLAYEREVENTS.GAUNTLETREWARD)) {
			SND.StartLocalSound(cgs.media.humiliationSound/*, CHAN_ANNOUNCER*/);
		}
		else if ((ps.persistant[PERS.PLAYEREVENTS] & PLAYEREVENTS.HOLYSHIT) !=
				(ops.persistant[PERS.PLAYEREVENTS] & PLAYEREVENTS.HOLYSHIT)) {
			SND.StartLocalSound(cgs.media.holyShitSound/*, CHAN_ANNOUNCER*/);
		}
		reward = true;
	}

	// Check for flag pickup.
	if (arena.gametype > GT.TEAM) {
		if ((ps.powerups[PW.REDFLAG] !== ops.powerups[PW.REDFLAG] && ps.powerups[PW.REDFLAG]) ||
			(ps.powerups[PW.BLUEFLAG] !== ops.powerups[PW.BLUEFLAG] && ps.powerups[PW.BLUEFLAG]) ||
			(ps.powerups[PW.NEUTRALFLAG] !== ops.powerups[PW.NEUTRALFLAG] && ps.powerups[PW.NEUTRALFLAG]) )
		{
			SND.StartLocalSound(cgs.media.youHaveFlagSound/*, CHAN_ANNOUNCER*/);
		}
	}

	// Lead changes.
	// Never play lead changes during warmup.
	if (!reward && arena.gamestate === GS.ACTIVE) {
		if (ps.persistant[PERS.RANK] !== ops.persistant[PERS.RANK]) {
			if (arena.gametype < GT.TEAM) {
				if (ps.persistant[PERS.RANK] === 0) {
					AddBufferedSound(cgs.media.takenLeadSound);
				} else if (ps.persistant[PERS.RANK] === RANK_TIED_FLAG) {
					AddBufferedSound(cgs.media.tiedLeadSound);
				} else if ((ops.persistant[PERS.RANK] & ~RANK_TIED_FLAG) === 0) {
					AddBufferedSound(cgs.media.lostLeadSound);
				}
			}
		}
	}

	// Timelimit warnings.
	if (cgs.timelimit > 0) {
		var msec = cg.time - cgs.levelStartTime;

		if (!(cg.timelimitWarnings & 4) && msec > (cgs.timelimit * 60 + 2) * 1000) {
			cg.timelimitWarnings |= 1 | 2 | 4;
			SND.StartLocalSound(cgs.media.suddenDeathSound/*, CHAN_ANNOUNCER*/);
		}
		else if (!(cg.timelimitWarnings & 2) && msec > (cgs.timelimit - 1) * 60 * 1000) {
			cg.timelimitWarnings |= 1 | 2;
			SND.StartLocalSound(cgs.media.oneMinuteSound/*, CHAN_ANNOUNCER*/);
		}
		else if (cgs.timelimit > 5 && !(cg.timelimitWarnings & 1) && msec > (cgs.timelimit - 5) * 60 * 1000) {
			cg.timelimitWarnings |= 1;
			SND.StartLocalSound(cgs.media.fiveMinuteSound/*, CHAN_ANNOUNCER*/);
		}
	}

	// Fraglimit warnings.
	if (cgs.fraglimit > 0 && arena.gametype < GT.CTF) {
		var score1 = arena.score1 ? arena.score1.score : 0;
		var score2 = arena.score2 ? arena.score2.score : 0;

		var highScore = score1;

		if (arena.gametype === GT.TEAM && score2 > highScore) {
			highScore = score2;
		}

		if (!(cg.fraglimitWarnings & 4) && highScore === (cgs.fraglimit - 1)) {
			cg.fraglimitWarnings |= 1 | 2 | 4;
			AddBufferedSound(cgs.media.oneFragSound);
		}
		else if (cgs.fraglimit > 2 && !(cg.fraglimitWarnings & 2) && highScore === (cgs.fraglimit - 2)) {
			cg.fraglimitWarnings |= 1 | 2;
			AddBufferedSound(cgs.media.twoFragSound);
		}
		else if (cgs.fraglimit > 3 && !(cg.fraglimitWarnings & 1) && highScore === (cgs.fraglimit - 3)) {
			cg.fraglimitWarnings |= 1;
			AddBufferedSound(cgs.media.threeFragSound);
		}
	}
}

/**
 * pushReward
 */
function pushReward(sfx, shader, rewardCount) {
	if (cg.rewardStack < (MAX_REWARDSTACK-1)) {
		cg.rewardStack++;
		cg.rewardSound[cg.rewardStack] = sfx;
		cg.rewardShader[cg.rewardStack] = shader;
		cg.rewardCount[cg.rewardStack] = rewardCount;
	}
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
		if (i >= ops.eventSequence ||
			// or the server told us to play another event instead of a predicted event we already issued
			// or something the server told us changed our prediction causing a different event
			(i > ops.eventSequence - MAX_PS_EVENTS && ps.events[i % MAX_PS_EVENTS] !== ops.events[i % MAX_PS_EVENTS]) ) {
			cent.currentState.event = ps.events[i % MAX_PS_EVENTS];
			cent.currentState.eventParm = ps.eventParms[i % MAX_PS_EVENTS];
			AddEntityEvent(cent, cent.lerpOrigin);
		}
	}
}

/**
 * ArenaChanged
 *
 * Called when the first snapshot is received as well as when the
 * client changes arenas.
 */
var lastArena;
function ArenaChanged() {
	if (!cg.snap) {
		return;
	}

	// Open ingame menu when changing arenas.
	var arena = cgs.arenas[cg.snap.ps.arenaNum];

	if (lastArena !== cg.snap.ps.arenaNum) {
		HandleEscape();
	}

	UpdateCurrentGame();

	lastArena = cg.snap.ps.arenaNum;
}

/**
 * Respawn
 *
 * A respawn happened this snapshot
 */
function Respawn() {
	// No error decay on player movement.
	cg.thisFrameTeleport = true;

	// Select the weapon the server says we are using.
	cg.weaponSelect = cg.snap.ps.weapon;
}
