/**
 * DrawLoading
 */
function DrawLoading() {
	ui.RenderView(ui.GetView('connect'));
}

/**********************************************************
 *
 * HUD
 *
 **********************************************************/

/**
 * DrawFPS
 */
var FPS_FRAMES    = 4;
var previousTimes = new Array(FPS_FRAMES);
var previousTime  = 0;
var previousIdx   = 0;

function DrawFPS() {
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

		cg_hud.setFPS(parseInt(1000 * FPS_FRAMES / total, 10));
	}
}

/**
 * DrawRenderCounts
 */
function DrawRenderCounts() {
	// Grab everything else from the renderer.
	var counts = re.GetCounts();
	cg_hud.setCounts({
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
 * DrawWeaponSelect
 */
var currentWeaponInfo = [];
function DrawWeaponSelect() {
	var bits = cg.snap.ps.stats[STAT.WEAPONS];

	for (var i = 1; i < MAX_WEAPONS; i++) {
		if (!(bits & (1 << i))) {
			currentWeaponInfo[i] = null;
			continue;
		}

		currentWeaponInfo[i] = cg.weaponInfo[i];
	}

	cg_hud.setWeapons(currentWeaponInfo, cg.weaponSelect);
}

/**
 * DrawAmmo
 */
function DrawAmmo() {
	cg_hud.setAmmo(cg.snap.ps.ammo);
}

/**
 * DrawArmor
 */
function DrawArmor() {
	cg_hud.setArmor(cg.snap.ps.stats[STAT.ARMOR]);
}

/**
 * DrawHealth
 */
function DrawHealth() {
	cg_hud.setHealth(cg.snap.ps.stats[STAT.HEALTH]);
}

/**
 * DrawKills
 */
function DrawKills() {
	cg_hud.setKills(cg.snap.ps.persistant[PERS.SCORE]);
}

/**
 * DrawTeam
 */
function DrawTeam() {
	cg_hud.setTeam(cg.snap.ps.persistant[PERS.TEAM]);
}

/**
 * DrawCrosshairNames
 */
function DrawCrosshairNames() {
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
	cg_hud.setCrosshairName(alpha === 0 ? null : name, alpha);
}

/**
 * ScanForCrosshairEntity
 */
function ScanForCrosshairEntity() {
	var start = vec3.set(cg.refdef.vieworg, [0, 0, 0]);
	var end = vec3.add(vec3.scale(cg.refdef.viewaxis[0], 131072, [0, 0, 0]), start);

	if (cg_crosshairShaders()) {
		var trace = Trace(start, end, QMath.vec3_origin, QMath.vec3_origin,
			-1, CONTENTS.SOLID | CONTENTS.BODY | CONTENTS.DETAIL);
		cg.crosshairName = trace.shaderName;
		cg.crosshairNameTime = cg.time;
		return;
	}

	var trace = Trace(start, end, QMath.vec3_origin, QMath.vec3_origin,
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
 * DrawWarmup
 */
function DrawWarmup() {
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
