/**
 * DrawLoading
 */
function DrawLoading() {
	ui.RenderView(cg_connect);
}

/**
 * Draw2D
 */
function Draw2D() {
	if (cg.snap.ps.pm_type === PM.INTERMISSION) {
		ui.RenderView(cg_scoreboard);
		return;
	}

	HudUpdateFPS();
	HudUpdateCounts();
	LagometerUpdate();

	// TODO We need to selectively hide things based on state.
	// if (cg.snap.ps.pm_type !== PM.DEAD) {

	if (cg.snap.ps.persistant[PERS.SPECTATOR_STATE] !== SPECTATOR.NOT) {
		HudUpdateCrosshairNames();
	} else {
		HudUpdateCrosshairNames();
		HudUpdateHealth();
		HudUpdateArmor();
		HudUpdateAmmo();
		HudUpdateScores();
		HudUpdateWeapons();
		// if (!DrawFollow()) {
			HudUpdateWarmup();
		// }
	}

	ui.RenderView(cg_hud);

	if (cg.showScores) {
		ui.RenderView(cg_scoreboard);
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
var FPS_FRAMES    = 4;
var previousTimes = new Array(FPS_FRAMES);
var previousTime  = 0;
var previousIdx   = 0;

function HudUpdateFPS() {
	// We calculate FPS on the client.
	var t = sys.GetMilliseconds();
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

		cg_hud.model.setFPS(parseInt(1000 * FPS_FRAMES / total, 10));
	}
}

/**
 * HudUpdateCounts
 */
function HudUpdateCounts() {
	// Grab everything else from the renderer.
	var counts = re.GetCounts();
	cg_hud.model.setCounts({
		shaders: counts.shaders,
		vertexes: counts.vertexes,
		indexes: counts.indexes,
		culledFaces: counts.culledFaces,
		culledModelOut: counts.culledModelOut,
		culledModelIn: counts.culledModelIn,
		culledModelClip: counts.culledModelClip
	});
}

/**
 * HudUpdateWeapons
 */
function HudUpdateWeapons() {
	var bits = cg.snap.ps.stats[STAT.WEAPONS];

	// Don't render WP.GAUNTLET.
	for (var i = 2; i < MAX_WEAPONS; i++) {
		if (!(bits & (1 << i))) {
			cg_hud.model.setWeapon(i, null);
			continue;
		}

		cg_hud.model.setWeapon(i, GetItemInfoForWeapon(i));
	}

	cg_hud.model.setWeaponSelect(cg.weaponSelect);
}

/**
 * HudUpdateAmmo
 */
function HudUpdateAmmo() {
	// Don't render WP.GAUNTLET.
	for (var i = 2; i < MAX_WEAPONS; i++) {
		cg_hud.model.setAmmo(i, cg.snap.ps.ammo[i]);
	}
}

/**
 * HudUpdateArmor
 */
function HudUpdateArmor() {
	cg_hud.model.setArmor(cg.snap.ps.stats[STAT.ARMOR]);
}

/**
 * HudUpdateHealth
 */
function HudUpdateHealth() {
	cg_hud.model.setHealth(cg.snap.ps.stats[STAT.HEALTH]);
}

/**
 * HudUpdateScores
 */
function HudUpdateScores() {
	if (!cgs.score1 || !cgs.score2) {
		error('No score configstrings.');
		return;
	}

	// We should always have a valid score for score1 when
	// rendering the hud.
	if (cgs.score1.s === SCORE_NOT_PRESENT) {
		error('Invalid score for score1.');
		return;
	}

	var localci = cgs.clientinfo[cg.snap.ps.clientNum];
	var ci1 = cgs.clientinfo[cgs.score1.n];
	var ci2 = null;
	var score1 = null;
	var score2 = null;

	if (cgs.score2.s !== SCORE_NOT_PRESENT) {
		ci2 = cgs.clientinfo[cgs.score2.n];
	}

	if (cgs.gametype < GT.TEAM) {
		score1 = { rank: 1, name: ci1.name, score: cgs.score1.s, localplayer: ci1 === localci };

		// If we're not in first, always draw our own score in score2.
		if (!score1.localplayer) {
			var rank = (cg.snap.ps.persistant[PERS.RANK] & ~RANK_TIED_FLAG) + 1;  // PERS.RANK is 0 indexed
			var score = cg.snap.ps.persistant[PERS.SCORE];

			score2 = { rank: rank, name: localci.name, score: score, localplayer: true };
		} else if (score1.localplayer && ci2) {
			var tied = cg.snap.ps.persistant[PERS.RANK] & RANK_TIED_FLAG;
			var rank = tied ? 1 : 2;  // render both as 1 when tied

			score2 = { rank: rank, name: ci2.name, score: cgs.score2.s, localplayer: false };
		}
	}

	cg_hud.model.setScore1(score1);
	cg_hud.model.setScore2(score2);
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

	// Draw the name of the player being looked at
	var name = cg.crosshairName;
	var alpha = FadeColor(cg.crosshairNameTime, 1000);

	// Reset name once alpha is 0.
	cg_hud.model.setCrosshairName(alpha === 0 ? null : name, alpha);
}

/**
 * ScanForCrosshairEntity
 */
function ScanForCrosshairEntity() {
	var start = vec3.set(cg.refdef.vieworg, [0, 0, 0]);
	var end = vec3.add(vec3.scale(cg.refdef.viewaxis[0], 131072, [0, 0, 0]), start);

	if (cg_crosshairShaders()) {
		var trace = Trace(start, end, QMath.vec3origin, QMath.vec3origin,
			-1, CONTENTS.SOLID | CONTENTS.BODY | CONTENTS.DETAIL);
		cg.crosshairName = trace.shaderName;
		cg.crosshairNameTime = cg.time;
		return;
	}

	var trace = Trace(start, end, QMath.vec3origin, QMath.vec3origin,
		cg.snap.ps.clientNum, CONTENTS.SOLID | CONTENTS.BODY);
	if (trace.entityNum >= MAX_CLIENTS) {
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
	cg.crosshairNameTime = cg.time;
}

/**
 * HudUpdateWarmup
 */
function HudUpdateWarmup() {
	if (!cg.warmup) {
		return;
	}

	if (cg.warmup < 0) {
		// s = "Waiting for players";
		// w = CG_DrawStrlen( s ) * BIGCHAR_WIDTH;
		// CG_DrawBigString(320 - w / 2, 24, s, 1.0F);
		cg.warmupCount = 0;
		return;
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

	var sec = Math.floor((cg.warmup - cg.time) / 1000);

	if (sec !== cg.warmupCount) {
		cg.warmupCount = sec;

		if (sec < 0) {
			snd.StartLocalSound(cgs.media.countFightSound/*, CHAN_ANNOUNCER*/);
		} else if (sec === 0) {
			snd.StartLocalSound(cgs.media.count1Sound/*, CHAN_ANNOUNCER*/);
		} else if (sec === 1) {
			snd.StartLocalSound(cgs.media.count2Sound/*, CHAN_ANNOUNCER*/);
		} else if (sec === 2) {
			snd.StartLocalSound(cgs.media.count3Sound/*, CHAN_ANNOUNCER*/);
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
	if (sec < 0) {
		cg.warmup = 0;
	}
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
	if (cg_drawLagometer()) {
		cg_hud.model.showLagometer();
	} else {
		cg_hud.model.hideLagometer();
	}
}

/**
 * LagometerAddFrame
 *
 * Adds the current interpolate / extrapolate bar for this frame.
 */
function LagometerAddFrame() {
	if (!cg_drawLagometer()) {
		return;
	}

	var offset = cg.time - cg.latestSnapshotTime;
	cg_hud.model.addLagometerFrame(offset);
}

/**
 * LagometerAddSnapshotInfo
 *
 * Each time a snapshot is received, log its ping time and
 * the number of snapshots that were dropped before it.
 */
function LagometerAddSnapshotInfo(snap) {
	if (!cg_drawLagometer()) {
		return;
	}

	// // Dropped packet.
	// if ( !snap ) {
	// 	lagometer.snapshotSamples[ lagometer.snapshotCount & ( LAG_SAMPLES - 1) ] = -1;
	// 	lagometer.snapshotCount++;
	// 	return;
	// }

	cg_hud.model.addSnapshotFrame(snap.ping, snap.snapFlags);
}


/**********************************************************
 *
 * Helpers
 *
 **********************************************************/
function FadeColor(startMsec, totalMsec) {
	if (startMsec === 0) {
		return 0;
	}

	var t = cg.time - startMsec;
	if (t >= totalMsec) {
		return 0;
	}

	// Fade out
	var color = 1.0;
	if (totalMsec - t < FADE_TIME) {
		color = (totalMsec - t) * 1.0 / FADE_TIME;
	}

	return color;
}