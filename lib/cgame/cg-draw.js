/**
 * DrawLoading
 */
function DrawLoading() {
	UI.RenderView(CL.GetLoadingView());
}

/**
 * Draw2D
 */
function Draw2D() {
	var arena = cgs.arenas[cg.snap.ps.arenaNum];
	hud_model.gametype(BG.GametypeNames[arena.gametype]);

	hud_model.alive(cg.snap.ps.pm_type !== PM.INTERMISSION &&
		cg.snap.ps.pm_type !== PM.SPECTATOR &&
		cg.snap.ps.pm_type !== PM.DEAD);

	UpdateFPS();
	UpdateCounts();
	UpdateLagometer();
	UpdateCrosshairNames();
	UpdateHealth();
	UpdateArmor();
	UpdateScores();
	UpdateWeapons();
	UpdateAmmo();
	// if (!DrawFollow()) {
		UpdateWarmup();
	// }

	UI.RenderView(hud_view);

	if (cg.snap.ps.pm_type === PM.INTERMISSION || cg.showScores) {
		UpdateScoreboard();

		UI.RenderView(scoreboard_view);
	}
}

/**********************************************************
 *
 * HUD
 *
 **********************************************************/

/**
 * UpdateFPS
 */
var FPS_FRAMES    = 30;
var previousTimes = new Array(FPS_FRAMES);
var previousTime  = 0;
var previousIdx   = 0;

function UpdateFPS() {
	// We calculate FPS on the client.
	var t = SYS.GetMilliseconds();
	var frameTime = t - previousTime;
	previousTime = t;

	previousTimes[previousIdx % FPS_FRAMES] = frameTime;
	previousIdx++;

	if (previousIdx > FPS_FRAMES) {
		// Average multiple frames together to smooth changes out a bit.
		var total = 0;

		for (var i = 0; i < FPS_FRAMES; i++) {
			total += previousTimes[i];
		}

		if (!total) {
			total = 1;
		}

		hud_model.fps(parseInt(1000 * FPS_FRAMES / total, 10));
	}
}

/**
 * UpdateCounts
 */
function UpdateCounts() {
	var counts = RE.GetCounts();

	hud_model.countsVisible(!!cg_drawLagometer.get());
	hud_model.shaders(counts.shaders);
	hud_model.nodes(counts.nodes);
	hud_model.leafs(counts.leafs);
	hud_model.surfaces(counts.surfaces);
	hud_model.indexes(counts.indexes);
	hud_model.culledModelOut(counts.culledModelOut);
	hud_model.culledModelIn(counts.culledModelIn);
	hud_model.culledModelClip(counts.culledModelClip);
}

/**
 * UpdateWeapons
 */
function UpdateWeapons() {
	var bits = cg.snap.ps.stats[STAT.WEAPONS];

	// Don't render WP.GAUNTLET.
	for (var i = 2; i < MAX_WEAPONS; i++) {
		if (!(bits & (1 << i))) {
			hud_model.setWeaponIcon(i, null);
			continue;
		}

		hud_model.setWeaponIcon(i, FindItemInfo(IT.WEAPON, i).gfx.icon);
	}

	hud_model.weaponSelect(cg.weaponSelect);
}

/**
 * UpdateAmmo
 */
function UpdateAmmo() {
	var bits = cg.snap.ps.stats[STAT.WEAPONS];

	// Don't render WP.GAUNTLET.
	for (var i = 2; i < MAX_WEAPONS; i++) {
		if (!(bits & (1 << i))) {
			continue;
		}

		hud_model.setWeaponAmmo(i, cg.snap.ps.ammo[i]);
	}
}

/**
 * UpdateArmor
 */
function UpdateArmor() {
	hud_model.armor(cg.snap.ps.stats[STAT.ARMOR]);
}

/**
 * UpdateHealth
 */
function UpdateHealth() {
	hud_model.health(cg.snap.ps.stats[STAT.HEALTH]);
}

/**
 * UpdateScores
 */
function UpdateScores() {
	if (!cg.snap) {
		return;
	}

	var arena = cgs.arenas[cg.snap.ps.arenaNum];
	var score1 = arena.score1;
	var score2 = arena.score2;

	var ci = cgs.clientinfo[cg.snap.ps.clientNum];

	if (arena.gametype === GT.ROCKETARENA) {
		hud_model.score1.localplayer(!score1 ? false : ci.group === score1.group);
		hud_model.score1.count(!score1 ? 0 : score1.alive);
		hud_model.score1.name(!score1 ? '' : score1.group);
		hud_model.score1.score(!score1 ? '' : score1.score);

		hud_model.score2.localplayer(!score2 ? false : ci.group === score2.group);
		hud_model.score2.count(!score2 ? 0 : score2.alive);
		hud_model.score2.name(!score2 ? '' : score2.group);
		hud_model.score2.score(!score2 ? '' : score2.score);
	}
	else if (arena.gametype >= GT.TEAM) {
		hud_model.score1.localplayer(ci.team === TEAM.RED);
		hud_model.score1.count(score1.count);
		hud_model.score1.name('Red Team');
		hud_model.score1.score(score1.score);

		hud_model.score2.localplayer(ci.team === TEAM.BLUE);
		hud_model.score2.count(score2.count);
		hud_model.score2.name('Blue Team');
		hud_model.score2.score(score2.score);
	} else {
		var ci1 = cgs.clientinfo[score1.clientNum];
		var ci2 = score2 ? cgs.clientinfo[score2.clientNum] : null;

		hud_model.score1.visible(true);
		hud_model.score1.localplayer(ci1 === ci);
		hud_model.score1.score(score1.score);
		hud_model.score1.rank(1);
		hud_model.score1.name(ci1.name);

		// If we're not in first, always draw our own score in score2.
		if (ci1 !== ci) {
			var rank = (cg.snap.ps.persistant[PERS.RANK] & ~RANK_TIED_FLAG) + 1;  // PERS.RANK is 0 indexed
			var score = cg.snap.ps.persistant[PERS.SCORE];

			hud_model.score2.visible(true);
			hud_model.score2.localplayer(true);
			hud_model.score2.score(score);
			hud_model.score2.rank(rank);
			hud_model.score2.name(ci.name);
		} else if (ci2) {
			var tied = cg.snap.ps.persistant[PERS.RANK] & RANK_TIED_FLAG;
			var rank = tied ? 1 : 2;  // render both as 1 when tied

			hud_model.score2.visible(true);
			hud_model.score2.localplayer(false);
			hud_model.score2.score(score2.score);
			hud_model.score2.rank(rank);
			hud_model.score2.name(ci2.name);
		} else {
			hud_model.score2.visible(false);
		}
	}
}

/**
 * UpdateCrosshairNames
 */
function UpdateCrosshairNames() {
	// if (!cg_drawCrosshair.integer) {
	// 	return;
	// }
	// if (!cg_drawCrosshairNames.integer) {
	// 	return;
	// }
	// if (cg.renderingThirdPerson) {
	// 	return;
	// }

	// Scan the known entities to see if the crosshair is sighted on one.
	ScanForCrosshairEntity();

	// Draw the name of the player being looked at.
	if (cg.crosshairName) {
		hud_model.setCrosshairName(cg.crosshairName);
	}
}

/**
 * ScanForCrosshairEntity
 */
function ScanForCrosshairEntity() {
	var trace = new QS.TraceResults();
	var start = vec3.create(cg.refdef.vieworg);
	var end = vec3.add(vec3.scale(cg.refdef.viewaxis[0], 131072, vec3.create()), start);

	if (cg_crosshairShaders.get()) {
		Trace(trace, start, end, QMath.vec3origin, QMath.vec3origin,
			cg.snap.ps.clientNum, SURF.CONTENTS.SOLID | SURF.CONTENTS.BODY | SURF.CONTENTS.DETAIL);
		cg.crosshairName = trace.shaderName;
		return;
	}

	Trace(trace, start, end, QMath.vec3origin, QMath.vec3origin,
		cg.snap.ps.clientNum, SURF.CONTENTS.SOLID | SURF.CONTENTS.BODY);

	if (trace.entityNum >= MAX_CLIENTS) {
		cg.crosshairName = null;
		return;
	}

	// // If the player is in fog, don't show it.
	// var content = CG_PointContents( trace.endpos, 0 );
	// if (content & SURF.CONTENTS.FOG) {
	// 	return;
	// }

	// If the player is invisible, don't show it.
	if (cg.entities[trace.entityNum].currentState.powerups & (1 << PW.INVIS)) {
		return;
	}

	// Update the fade timer.
	cg.crosshairName = cgs.clientinfo[trace.entityNum].name;
}

/**
 * UpdateWarmup
 */
function UpdateWarmup() {
	if (!cg.snap) {
		return;
	}

	var arena = cgs.arenas[cg.snap.ps.arenaNum];
	var gamestate = arena.gamestate;
	var warmup = arena.warmupTime;

	hud_model.gamestate(gamestate);

	// Waiting for players.
	if (gamestate === GS.WAITING) {
		// s = "Waiting for players";
		// w = CG_DrawStrlen( s ) * BIGCHAR_WIDTH;
		// CG_DrawBigString(320 - w / 2, 24, s, 1.0F);
		hud_model.warmup('Waiting for players');
		return;
	}

	// if (arena.gametype === GT.TOURNAMENT) {
	// 	// Find the two active players.
	// 	var ci1;
	// 	var ci2;

	// 	for (var i = 0; i < cgs.maxclients; i++) {
	// 		if (cgs.clientinfo[i].infoValid && cgs.clientinfo[i].team === TEAM.FREE) {
	// 			if (!ci1) {
	// 				ci1 = cgs.clientinfo[i];
	// 			} else {
	// 				ci2 = cgs.clientinfo[i];
	// 			}
	// 		}
	// 	}

	// 	if (ci1 && ci2) {
	// 		// var s = va( "%s vs %s", ci1->name, ci2->name );
	// 		// w = CG_DrawStrlen( s );
	// 		// if ( w > 640 / GIANT_WIDTH ) {
	// 		// 	cw = 640 / w;
	// 		// } else {
	// 		// 	cw = GIANT_WIDTH;
	// 		// }
	// 		// CG_DrawStringExt( 320 - w * cw/2, 20,s, colorWhite, qfalse, qtrue, cw, (int)(cw * 1.5f), 0 );
	// 	}
	// }

	// Ending warmup.
	if (cg.lastGamestate === GS.COUNTDOWN && gamestate === GS.ACTIVE) {
		SND.StartLocalSound(cgs.media.countFightSound/*, CHAN_ANNOUNCER*/);
	}
	else if (gamestate === GS.COUNTDOWN) {
		// Entering a new warmup.
		if (gamestate !== cg.lastGamestate) {
			cg.warmupCount = -1;
			SND.StartLocalSound(cgs.media.countPrepareSound/*, CHAN_ANNOUNCER*/);
		}

		var sec = Math.floor((warmup - cg.time) / 1000);
		if (sec !== cg.warmupCount) {
			cg.warmupCount = sec;

			if (sec === 0) {
				SND.StartLocalSound(cgs.media.count1Sound/*, CHAN_ANNOUNCER*/);
			} else if (sec === 1) {
				SND.StartLocalSound(cgs.media.count2Sound/*, CHAN_ANNOUNCER*/);
			} else if (sec === 2) {
				SND.StartLocalSound(cgs.media.count3Sound/*, CHAN_ANNOUNCER*/);
			}
		}

		if (sec < 0) {
			// CG_CenterPrint( "FIGHT!", 120, GIANTCHAR_WIDTH*2 );
			hud_model.setCenterPrint('FIGHT!');
		} else {
			var str = 'Starts in: ' + (sec + 1);
			// switch ( cg.warmupCount ) {
			// 	case 0:
			// 		cw = 28;
			// 		break;
			// 	case 1:
			// 		cw = 24;
			// 		break;
			// 	case 2:
			// 		cw = 20;
			// 		break;
			// 	default:
			// 		cw = 16;
			// 		break;
			// }
			// w = CG_DrawStrlen( s );
			// CG_DrawStringExt( 320 - w * cw/2, 70, s, colorWhite,  qfalse, qtrue, cw, (int)(cw * 1.5), 0 );
			hud_model.warmup(str);
		}
	}

	cg.lastGamestate = gamestate;
}

/**********************************************************
 *
 * Lagometer
 *
 **********************************************************/

/**
 * UpdateLagometer
 */
function UpdateLagometer() {
	hud_model.lagometerVisible(!!cg_drawLagometer.get());
}

/**
 * AddLagometerFrame
 *
 * Adds the current interpolate / extrapolate bar for this frame.
 */
function AddLagometerFrame() {
	if (!cg_drawLagometer.get()) {
		return;
	}

	var offset = cg.time - cg.latestSnapshotTime;
	hud_model.addLagometerFrame(offset);
}

/**
 * AddSnapshotInfo
 *
 * Each time a snapshot is received, log its ping time and
 * the number of snapshots that were dropped before it.
 */
function AddSnapshotInfo(snap) {
	if (!cg_drawLagometer.get()) {
		return;
	}

	// // Dropped packet.
	// if ( !snap ) {
	// 	lagometer.snapshotSamples[ lagometer.snapshotCount & ( LAG_SAMPLES - 1) ] = -1;
	// 	lagometer.snapshotCount++;
	// 	return;
	// }

	hud_model.addSnapshotFrame(snap.ping, snap.snapFlags);
}

/**********************************************************
 *
 * Update scoreboard
 *
 **********************************************************/

/**
 * UpdateScoreboard
 *
 * Called whenever the scoreboard is active, however, the scores
 * are not actually added here, but by cg-servercmds.js when we
 * receive them.
 */
function UpdateScoreboard() {
	var arena = cgs.arenas[cg.snap.ps.arenaNum];
	var message = Configstring('message');

	scoreboard_model.mapname(arena.name === 'default' ? message : arena.name);
	scoreboard_model.gametype(BG.GametypeNames[arena.gametype]);
	scoreboard_model.timelimit(cgs.timelimit);
	scoreboard_model.fraglimit(cgs.fraglimit);
	scoreboard_model.capturelimit(cgs.capturelimit);
}

/**********************************************************
 *
 * Current game menu
 *
 **********************************************************/

/**
 * UpdateGameArenas
 *
 * Called both when the arena configstrings change, as well
 * as when the user changes arenas.
 *
 * NOTE: The reason we don't update this solely from inside
 * of cg-servercmds (like we do with the scoreboard) is because
 * we want to store arena / team info for ALL arenas that way
 * we can immediately update the UI on an arena change (from
 * inside of cg-playerstate) and have no popping of information.
 */
function UpdateGameArenas() {
	// No snapshot on initial configstring update.
	if (!cg.snap) {
		return;
	}

	currentgame_model.currentArenaNum(cg.snap.ps.arenaNum);

	for (var i = 0; i < cgs.arenas.length; i++) {
		var arena = cgs.arenas[i];
		var arenaModel = currentgame_model.getArena(i);

		arenaModel.gametype(BG.GametypeNames[arena.gametype]);
		arenaModel.name(arena.name);
		arenaModel.numConnectedClients(arena.numConnectedClients);
		arenaModel.playersPerTeam(arena.playersPerTeam);
		arenaModel.score1(arena.score1);
		arenaModel.score2(arena.score2);
	}
}

/**
 * UpdateGameGroups
 *
 * Called whenever the user changes arena as well as
 * when a client's userinfo changes.
 */
function UpdateGameGroups() {
	// No snapshot on initial configstring update.
	if (!cg.snap) {
		return;
	}

	// Generate group names / counts from userinfo strings.
	var groups = {};

	for (var i = 0; i < MAX_CLIENTS; i++) {
		var ci = cgs.clientinfo[i];

		if (!ci) {
			continue;
		}

		if (ci.arena !== cg.snap.ps.arenaNum || ci.group === null) {
			continue;
		}

		if (!groups[ci.group]) {
			groups[ci.group] = 0;
		}

		groups[ci.group]++;
	}

	//
	var ci = cgs.clientinfo[cg.snap.ps.clientNum];
	currentgame_model.currentGroup(ci.group);

	var arenaModel = currentgame_model.getArena(cg.snap.ps.arenaNum);
	arenaModel.clearGroups();

	for (var key in groups) {
		if (!groups.hasOwnProperty(key)) {
			continue;
		}

		arenaModel.addGroup(key, groups[key]);
	}
}