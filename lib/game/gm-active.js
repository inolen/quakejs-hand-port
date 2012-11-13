/**
 * TouchTriggers
 *
 * Find all trigger entities that ent's current position touches.
 * Spectators will only interact with teleporters.
 */
function TouchTriggers(ent) {
	if (!ent.client) {
		return;
	}

	var ps = ent.client.ps;
	var range = [40, 40, 52];
	var mins = [0, 0, 0], maxs = [0, 0, 0];
	vec3.subtract(ps.origin, range, mins);
	vec3.add(ps.origin, range, maxs);

	var entityNums = sv.FindEntitiesInBox(mins, maxs);

	/*// can't use ent->absmin, because that has a one unit pad
	vec3.add(ps.origin, ent.r.mins, mins);
	vec3.add(ps.origin, ent.r.maxs, maxs);*/

	for (var i = 0; i < entityNums.length; i++) {
		var hit = level.gentities[entityNums[i]];

		// If they don't have callbacks.
		if (!hit.touch) {
			continue;
		}

		if (!(hit.contents & ContentTypes.TRIGGER)) {
			continue;
		}

		/*if (!trap_EntityContact(mins, maxs, hit) ) {
			continue;
		}*/

		hit.touch.call(this, hit, ent);
	}

	// if we didn't touch a jump pad this pmove frame
	if (ps.jumppad_frame != ps.pmove_framecount) {
		ps.jumppad_frame = 0;
		ps.jumppad_ent = 0;
	}
}