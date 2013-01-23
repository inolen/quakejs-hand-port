/**
 * DrawLoading
 */
function DrawLoading() {
	ui.RenderView(view_loading);
}

/**
 * Draw2D
 */
function Draw2D() {
	if (cg.snap.ps.pm_type === PM.INTERMISSION) {
		ui.RenderView(view_scoreboard);
		return;
	}

	HudUpdateFPS();
	HudUpdateCounts();
	LagometerUpdate();

	// TODO We need to selectively hide things based on state.
	// if (cg.snap.ps.pm_type !== PM.DEAD) {

	if (cg.snap.ps.persistant[PERS.SPECTATOR_STATE] !== SPECTATOR.NOT) {
		HudUpdateCrosshairNames();
		HudUpdateScores();
	} else {
		HudUpdateCrosshairNames();
		HudUpdateHealth();
		HudUpdateArmor();
		HudUpdateWeapons();
		HudUpdateAmmo();
		HudUpdateScores();
		// if (!DrawFollow()) {
			HudUpdateWarmup();
		// }
	}

	ui.RenderView(view_hud);

	if (cg.showScores) {
		ui.RenderView(view_scoreboard);
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

		view_hud.setFPS(parseInt(1000 * FPS_FRAMES / total, 10));
	}
}

/**
 * HudUpdateCounts
 */
function HudUpdateCounts() {
	// Grab everything else from the renderer.
	var counts = re.GetCounts();
	view_hud.setCounts({
		shaders: counts.shaders,
		nodes: counts.nodes,
		leafs: counts.leafs,
		surfaces: counts.surfaces,
		indexes: counts.indexes,
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
			view_hud.setWeapon(i, null);
			continue;
		}

		view_hud.setWeapon(i, FindItemInfo(IT.WEAPON, i));
	}

	view_hud.setWeaponSelect(cg.weaponSelect);
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

		view_hud.setAmmo(i, cg.snap.ps.ammo[i]);
	}
}

/**
 * HudUpdateArmor
 */
function HudUpdateArmor() {
	view_hud.setArmor(cg.snap.ps.stats[STAT.ARMOR]);
}

/**
 * HudUpdateHealth
 */
function HudUpdateHealth() {
	view_hud.setHealth(cg.snap.ps.stats[STAT.HEALTH]);
}

/**
 * HudUpdateScores
 */
function HudUpdateScores() {
	if (!cgs.score1 || !cgs.score2) {
		return;
	}

	// We should always have a valid score for score1 when
	// rendering the hud.
	if (cgs.score1.s === SCORE_NOT_PRESENT) {
		error('Invalid score for score1.');
		return;
	}

	var localci = cgs.clientinfo[cg.snap.ps.clientNum];
	var score1 = null;
	var score2 = null;

	if (cgs.gametype >= GT.TEAM) {
		// if ( cgs.gametype == GT_CTF ) {
		// 	// Display flag status
		// 	item = BG_FindItemForPowerup( PW_BLUEFLAG );

		// 	if (item) {
		// 		y1 = y - BIGCHAR_HEIGHT - 8;
		// 		if( cgs.blueflag >= 0 && cgs.blueflag <= 2 ) {
		// 			CG_DrawPic( x, y1-4, w, BIGCHAR_HEIGHT+8, cgs.media.blueFlagShader[cgs.blueflag] );
		// 		}
		// 	}
		// }

		// if ( cgs.gametype == GT_CTF ) {
		// 	// Display flag status
		// 	item = BG_FindItemForPowerup( PW_REDFLAG );

		// 	if (item) {
		// 		y1 = y - BIGCHAR_HEIGHT - 8;
		// 		if( cgs.redflag >= 0 && cgs.redflag <= 2 ) {
		// 			CG_DrawPic( x, y1-4, w, BIGCHAR_HEIGHT+8, cgs.media.redFlagShader[cgs.redflag] );
		// 		}
		// 	}
		// }
		score1 = { score: cgs.score1.s, count: cgs.score1.c, localplayer: localci.team === TEAM.RED };
		score2 = { score: cgs.score2.s, count: cgs.score2.c, localplayer: localci.team === TEAM.BLUE };
	} else {
		var ci1 = cgs.clientinfo[cgs.score1.n];
		var ci2 = null;
		if (cgs.score2.s !== SCORE_NOT_PRESENT) {
			ci2 = cgs.clientinfo[cgs.score2.n];
		}

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

	view_hud.setGametype(GametypeNames[cgs.gametype]);
	view_hud.setScore1(score1);
	view_hud.setScore2(score2);
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
	view_hud.setCrosshairName(cg.crosshairName);
}

/**
 * ScanForCrosshairEntity
 */
function ScanForCrosshairEntity() {
	var start = vec3.create(cg.refdef.vieworg);
	var end = vec3.add(vec3.scale(cg.refdef.viewaxis[0], 131072, vec3.create()), start);

	if (cg_crosshairShaders()) {
		var trace = Trace(start, end, QMath.vec3origin, QMath.vec3origin,
			cg.snap.ps.clientNum, CONTENTS.SOLID | CONTENTS.BODY | CONTENTS.DETAIL);
		cg.crosshairName = trace.shaderName;
		return;
	}

	var trace = Trace(start, end, QMath.vec3origin, QMath.vec3origin,
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
		view_hud.showLagometer();
	} else {
		view_hud.hideLagometer();
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
	view_hud.addLagometerFrame(offset);
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

	view_hud.addSnapshotFrame(snap.ping, snap.snapFlags);
}