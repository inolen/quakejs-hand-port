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
		var trace = Trace(start, end, QMath.vec3_origin, QMath.vec3_origin, -1, CONTENTS.SOLID | CONTENTS.BODY);
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