/**
 * QUAKED func_plat (0 .5 .8) ?
 * Plats are always drawn in the extended position so they will light correctly.
 *
 * "lip"    default 8, protrusion above rest position
 * "height" total height of movement, defaults to model height
 * "speed"  overrides default 200.
 * "dmg"    overrides default 2
 * "model2" .md3 model to also draw
 * "color"  constantLight color
 * "light"  constantLight radius
 */
spawnFuncs['func_plat'] = function (ent) {
	// ent.sound1to2 = ent.sound2to1 = G_SoundIndex("sound/movers/plats/pt1_strt.wav");
	// ent.soundPos1 = ent.soundPos2 = G_SoundIndex("sound/movers/plats/pt1_end.wav");

	ent.s.angles[0] = ent.s.angles[1] = ent.s.angles[2] = 0.0;
	ent.speed = SpawnFloat('speed', 200);
	ent.damage = SpawnFloat('dmg', 2);
	ent.wait = SpawnFloat('wait', 1);

	var phase = SpawnFloat('phase', 0);

	ent.wait = 1000;

	// Create second position.
	SV.SetBrushModel(ent, ent.model);

	var lip = SpawnFloat('lip', 8);
	var height = SpawnFloat('height', 0);

	if (!height) {
		height = (ent.r.maxs[2] - ent.r.mins[2]) - lip;
	}

	// pos1 is the rest (bottom) position, pos2 is the top
	vec3.set(ent.s.origin, ent.pos2);
	vec3.set(ent.pos2, ent.pos1);
	ent.pos1[2] -= height;

	InitMover(ent);

	// Touch function keeps the plat from returning while
	// a live player is standing on it.
	ent.touch = TouchPlat;
	// ent.blocked = DoorBlocked;

	ent.parent = ent;  // so it can be treated as a door

	// Spawn the trigger if one hasn't been custom made.
	if (!ent.targetName) {
		SpawnPlatTrigger(ent);
	}
}

/**
 * SpawnPlatTrigger
 *
 * Spawn a trigger in the middle of the plat's low position
 * Elevator cars require that the trigger extend through the entire low position,
 * not just sit on top of it.
 */
function SpawnPlatTrigger(ent) {
	// The middle trigger will be a thin trigger just
	// above the starting position.
	var trigger = SpawnEntity();
	trigger.classname = 'plat_trigger';
	trigger.touch = TouchPlatCenterTrigger;
	trigger.r.contents = SURF.CONTENTS.TRIGGER;
	trigger.parent = ent;

	var tmin = vec3.createFrom(
		ent.pos1[0] + ent.r.mins[0] + 33,
		ent.pos1[1] + ent.r.mins[1] + 33,
		ent.pos1[2] + ent.r.mins[2]
	);

	var tmax = vec3.createFrom(
		ent.pos1[0] + ent.r.maxs[0] - 33,
		ent.pos1[1] + ent.r.maxs[1] - 33,
		ent.pos1[2] + ent.r.maxs[2] + 8
	);

	if (tmax[0] <= tmin[0]) {
		tmin[0] = ent.pos1[0] + (ent.r.mins[0] + ent.r.maxs[0]) *0.5;
		tmax[0] = tmin[0] + 1;
	}
	if (tmax[1] <= tmin[1]) {
		tmin[1] = ent.pos1[1] + (ent.r.mins[1] + ent.r.maxs[1]) *0.5;
		tmax[1] = tmin[1] + 1;
	}

	vec3.set(tmin, trigger.r.mins);
	vec3.set(tmax, trigger.r.maxs);

	SV.LinkEntity(trigger);
}

/**
 * TouchPlat
 *
 * Don't allow decent if a living player is on it.
 */
function TouchPlat(ent, other) {
	if (!other.client || other.client.ps.pm_type === PM.DEAD) {
		return;
	}

	// Delay return-to-pos1 by one second.
	if (ent.moverState === MOVER.POS2) {
		ent.nextthink = level.time + 1000;
	}
}

/**
 * TouchPlatCenterTrigger
 *
 * If the plat is at the bottom position, start it going up.
 */
function TouchPlatCenterTrigger(ent, other) {
	if (!other.client) {
		return;
	}

	if (ent.parent.moverState === MOVER.POS1) {
		UseBinaryMover(ent.parent, ent, other);
	}
}

