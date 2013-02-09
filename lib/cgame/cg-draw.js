/**
 * DrawLoading
 */
function DrawLoading() {
	UI.RenderView(view_loading);
}

/**
 * Draw2D
 */
function Draw2D() {
	if (cg.snap.ps.pm_type === PM.INTERMISSION) {
		UI.RenderView(view_scoreboard);
		return;
	}

	HudUpdateFPS();
	HudUpdateCounts();
	LagometerUpdate();

	// TODO We need to selectively hide things based on state.
	// if (cg.snap.ps.pm_type !== PM.DEAD) {

	if (cg.snap.ps.pm_type === PM.SPECTATOR) {
		HudUpdateCrosshairNames();
	} else {
		HudUpdateCrosshairNames();
		HudUpdateHealth();
		HudUpdateArmor();
		HudUpdateWeapons();
		HudUpdateAmmo();
		// if (!DrawFollow()) {
			HudUpdateWarmup();
		// }
	}

	UI.RenderView(view_hud);

	if (cg.showScores) {
		UI.RenderView(view_scoreboard);
	}
}

/**********************************************************
 *
 * HUD
 *
 **********************************************************/

/**
 * HudUpdateFPS
 */
var FPS_FRAMES    = 30;
var previousTimes = new Array(FPS_FRAMES);
var previousTime  = 0;
var previousIdx   = 0;

function HudUpdateFPS() {
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

		view_hud.fps(parseInt(1000 * FPS_FRAMES / total, 10));
	}
}

/**
 * HudUpdateCounts
 */
function HudUpdateCounts() {
	var counts = RE.GetCounts();

	view_hud.shaders(counts.shaders);
	view_hud.nodes(counts.nodes);
	view_hud.leafs(counts.leafs);
	view_hud.surfaces(counts.surfaces);
	view_hud.indexes(counts.indexes);
	view_hud.culledModelOut(counts.culledModelOut);
	view_hud.culledModelIn(counts.culledModelIn);
	view_hud.culledModelClip(counts.culledModelClip);
}

/**
 * HudUpdateWeapons
 */
function HudUpdateWeapons() {
	var bits = cg.snap.ps.stats[STAT.WEAPONS];

	// Don't render WP.GAUNTLET.
	for (var i = 2; i < MAX_WEAPONS; i++) {
		if (!(bits & (1 << i))) {
			view_hud.setWeaponIcon(i, null);
			continue;
		}

		view_hud.setWeaponIcon(i, FindItemInfo(IT.WEAPON, i).gfx.icon);
	}

	view_hud.weaponSelect(cg.weaponSelect);
}

/**
 * HudUpdateAmmo
 */
function HudUpdateAmmo() {
	var bits = cg.snap.ps.stats[STAT.WEAPONS];

	// Don't render WP.GAUNTLET.
	for (var i = 2; i < MAX_WEAPONS; i++) {
		if (!(bits & (1 << i))) {
			continue;
		}

		view_hud.setWeaponAmmo(i, cg.snap.ps.ammo[i]);
	}
}

/**
 * HudUpdateArmor
 */
function HudUpdateArmor() {
	view_hud.armor(cg.snap.ps.stats[STAT.ARMOR]);
}

/**
 * HudUpdateHealth
 */
function HudUpdateHealth() {
	view_hud.health(cg.snap.ps.stats[STAT.HEALTH]);
}

/**
 * HudUpdateScores
 *
 * Called when new info1 / info2 configstrings are received
 * as well as when the user changes their arena.
 */
function HudUpdateScores() {
	if (!cg.snap) {
		return;
	}

	var arena = cgs.arenas[cg.snap.ps.arenaNum];

	// We should always have a valid score for score1 when
	// rendering the hud.
	if (arena.score1 === SCORE_NOT_PRESENT) {
		error('Invalid score for score1.');
		return;
	}

	var ci = cgs.clientinfo[cg.snap.ps.clientNum];

	view_hud.gametype(BG.GametypeNames[cgs.gametype]);

	if (cgs.gametype >= GT.TEAM) {
		view_hud.score1.localplayer(ci.team === TEAM.RED);
		view_hud.score1.score(arena.score1);
		view_hud.score1.count(arena.count1);

		view_hud.score2.localplayer(ci.team === TEAM.BLUE);
		view_hud.score2.score(arena.score2);
		view_hud.score2.count(arena.count2);
	} else {
		var ci1 = cgs.clientinfo[arena.count1];
		var ci2 = arena.score2 !== SCORE_NOT_PRESENT ? cgs.clientinfo[arena.count2] : null;

		view_hud.score1.localplayer(ci1 === ci);
		view_hud.score1.score(arena.score1);
		view_hud.score1.rank(1);
		view_hud.score1.name(ci.name);

		// If we're not in first, always draw our own score in score2.
		if (!view_hud.score1.localplayer()) {
			var rank = (cg.snap.ps.persistant[PERS.RANK] & ~RANK_TIED_FLAG) + 1;  // PERS.RANK is 0 indexed
			var score = cg.snap.ps.persistant[PERS.SCORE];

			view_hud.score2.localplayer(true);
			view_hud.score2.score(score);
			view_hud.score2.rank(rank);
			view_hud.score2.name(ci.name);
		} else if (ci2) {
			var tied = cg.snap.ps.persistant[PERS.RANK] & RANK_TIED_FLAG;
			var rank = tied ? 1 : 2;  // render both as 1 when tied

			view_hud.score2.localplayer(false);
			view_hud.score2.score(arena.score2);
			view_hud.score2.rank(rank);
			view_hud.score2.name(ci2.name);
		}
	}
}

/**
 * HudUpdateCrosshairNames
 */
function HudUpdateCrosshairNames() {
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
	view_hud.crosshairName(cg.crosshairName || '');
}

/**
 * ScanForCrosshairEntity
 */
function ScanForCrosshairEntity() {
	var trace = new QS.TraceResults();
	var start = vec3.create(cg.refdef.vieworg);
	var end = vec3.add(vec3.scale(cg.refdef.viewaxis[0], 131072, vec3.create()), start);

	if (cg_crosshairShaders.getAsInt()) {
		Trace(trace, start, end, QMath.vec3origin, QMath.vec3origin,
			cg.snap.ps.clientNum, CONTENTS.SOLID | CONTENTS.BODY | CONTENTS.DETAIL);
		cg.crosshairName = trace.shaderName;
		return;
	}

	Trace(trace, start, end, QMath.vec3origin, QMath.vec3origin,
		cg.snap.ps.clientNum, CONTENTS.SOLID | CONTENTS.BODY);

	if (trace.entityNum >= MAX_CLIENTS) {
		cg.crosshairName = null;
		return;
	}

	// // If the player is in fog, don't show it.
	// var content = CG_PointContents( trace.endpos, 0 );
	// if (content & CONTENTS.FOG) {
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
 * HudUpdateWarmup
 */
function HudUpdateWarmup() {
	if (!cg.snap) {
		return;
	}

	var warmup = cgs.arenas[cg.snap.ps.arenaNum].warmup;

	// Waiting for players.
	if (warmup < 0) {
		// s = "Waiting for players";
		// w = CG_DrawStrlen( s ) * BIGCHAR_WIDTH;
		// CG_DrawBigString(320 - w / 2, 24, s, 1.0F);
		cg.warmupCount = 0;
		return;
	}

	// Warmup is over.
	var sec = Math.floor((warmup - cg.time) / 1000);
	if (sec < 0 && cg.warmupCount < 0) {
		return;
	}

	// Entering a new warmup.
	if (warmup > 0 && warmup !== cg.lastWarmup) {
		cg.warmupCount = -1;
		SND.StartLocalSound(cgs.media.countPrepareSound/*, CHAN_ANNOUNCER*/);
	}

	if (cgs.gametype === GT.TOURNAMENT) {
		// Find the two active players.
		var ci1;
		var ci2;

		for (var i = 0; i < cgs.maxclients; i++) {
			if (cgs.clientinfo[i].infoValid && cgs.clientinfo[i].team === TEAM.FREE) {
				if (!ci1) {
					ci1 = cgs.clientinfo[i];
				} else {
					ci2 = cgs.clientinfo[i];
				}
			}
		}

		if (ci1 && ci2) {
			// var s = va( "%s vs %s", ci1->name, ci2->name );
			// w = CG_DrawStrlen( s );
			// if ( w > 640 / GIANT_WIDTH ) {
			// 	cw = 640 / w;
			// } else {
			// 	cw = GIANT_WIDTH;
			// }
			// CG_DrawStringExt( 320 - w * cw/2, 20,s, colorWhite, qfalse, qtrue, cw, (int)(cw * 1.5f), 0 );
		}
	} else {
		// if (cgs.gametype === GT.FFA) {
		// 	s = "Free For All";
		// } else if (cgs.gametype === GT.TEAM) {
		// 	s = "Team Deathmatch";
		// } else if (cgs.gametype === GT.CTF) {
		// 	s = "Capture the Flag";
		// } else {
		// 	s = "";
		// }

		// w = CG_DrawStrlen( s );
		// if ( w > 640 / GIANT_WIDTH ) {
		// 	cw = 640 / w;
		// } else {
		// 	cw = GIANT_WIDTH;
		// }
		// CG_DrawStringExt( 320 - w * cw/2, 25,s, colorWhite, qfalse, qtrue, cw, (int)(cw * 1.1f), 0 );
	}

	if (sec !== cg.warmupCount) {
		cg.warmupCount = sec;

		if (sec < 0) {
			SND.StartLocalSound(cgs.media.countFightSound/*, CHAN_ANNOUNCER*/);
		} else if (sec === 0) {
			SND.StartLocalSound(cgs.media.count1Sound/*, CHAN_ANNOUNCER*/);
		} else if (sec === 1) {
			SND.StartLocalSound(cgs.media.count2Sound/*, CHAN_ANNOUNCER*/);
		} else if (sec === 2) {
			SND.StartLocalSound(cgs.media.count3Sound/*, CHAN_ANNOUNCER*/);
		}
	}

	// if (sec < 0) {
	// 	CG_CenterPrint( "FIGHT!", 120, GIANTCHAR_WIDTH*2 );
	// }

	// s = va( "Starts in: %i", sec + 1 );

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

	// Warmup is over.
	cg.lastWarmup = warmup;
}

/**********************************************************
 *
 * Lagometer
 *
 **********************************************************/

/**
 * LagometerUpdate
 */
function LagometerUpdate() {
	if (cg_drawLagometer.getAsInt()) {
		view_hud.lagometerVisible(true);
	} else {
		view_hud.lagometerVisible(false);
	}
}

/**
 * LagometerAddFrame
 *
 * Adds the current interpolate / extrapolate bar for this frame.
 */
function LagometerAddFrame() {
	if (!cg_drawLagometer.getAsInt()) {
		return;
	}

	var offset = cg.time - cg.latestSnapshotTime;
	view_hud.addLagometerFrame(offset);
}

/**
 * LagometerAddSnapshotInfo
 *
 * Each time a snapshot is received, log its ping time and
 * the number of snapshots that were dropped before it.
 */
function LagometerAddSnapshotInfo(snap) {
	if (!cg_drawLagometer.getAsInt()) {
		return;
	}

	// // Dropped packet.
	// if ( !snap ) {
	// 	lagometer.snapshotSamples[ lagometer.snapshotCount & ( LAG_SAMPLES - 1) ] = -1;
	// 	lagometer.snapshotCount++;
	// 	return;
	// }

	view_hud.addSnapshotFrame(snap.ping, snap.snapFlags);
}

/**********************************************************
 *
 * Ingame menu
 *
 **********************************************************/
function IngameUpdateArenas() {
	if (!cg.snap) {
		return;
	}

	view_ingame.currentTeam(cg.snap.ps.persistant[PERS.TEAM]);
	view_ingame.currentArenaNum(cg.snap.ps.arenaNum);

	for (var i = 0; i < cgs.arenas.length; i++) {
		var arena = view_ingame.getArena(i);

		arena.name(cgs.arenas[i].name);
		arena.playersPerTeam(cgs.arenas[i].playersPerTeam);
		arena.numPlayingClients(cgs.arenas[i].numPlayingClients);
		arena.count1(cgs.arenas[i].count1);
		arena.count2(cgs.arenas[i].count2);
	}
}