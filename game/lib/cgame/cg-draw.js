var FPS_FRAMES    = 4;
var previousTimes = new Array(FPS_FRAMES);
var previousTime  = 0;
var previousIdx   = 0;

/**
 * DrawRenderCounts
 */
function DrawRenderCounts() {
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