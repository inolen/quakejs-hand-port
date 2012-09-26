
/*
============
G_TouchTriggers

Find all trigger entities that ent's current position touches.
Spectators will only interact with teleporters.
============
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

	/*if (entityNums.length > 0 && entityNums[0] !== 0) {
		console.log('TouchTriggers', entityNums);
	}*/

	/*// can't use ent->absmin, because that has a one unit pad
	vec3.add(ps.origin, ent.r.mins, mins);
	vec3.add(ps.origin, ent.r.maxs, maxs);*/

	for (var i = 0; i < entityNums; i++) {
		var hit = level.entities[entityNums[i]];

		// If they don't have callbacks.
		if (!hit.touch) {
			continue;
		}

		if (!(hit.contents & CONTENTS_TRIGGER)) {
			continue;
		}

		/*if (!trap_EntityContact(mins, maxs, hit) ) {
			continue;
		}*/

		hit.touch.call(hit, ent);
	}

	// if we didn't touch a jump pad this pmove frame
	if (ps.jumppad_frame != ps.pmove_framecount) {
		ps.jumppad_frame = 0;
		ps.jumppad_ent = 0;
	}
}