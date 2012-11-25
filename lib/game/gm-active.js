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

	// Dead clients don't activate triggers!
	if (ent.client.pm_type === PM.DEAD) {
		return;
	}

	var ps = ent.client.ps;
	var range = [40, 40, 52];
	var mins = [0, 0, 0];
	var maxs = [0, 0, 0];

	vec3.subtract(ps.origin, range, mins);
	vec3.add(ps.origin, range, maxs);

	var entityNums = sv.FindEntitiesInBox(mins, maxs);

	// Can't use ent->absmin, because that has a one unit pad.
	vec3.add(ps.origin, ent.mins, mins);
	vec3.add(ps.origin, ent.maxs, maxs);

	for (var i = 0; i < entityNums.length; i++) {
		var hit = level.gentities[entityNums[i]];

		// If they don't have callbacks.
		if (!hit.touch) {
			continue;
		}

		if (!(hit.contents & CONTENTS.TRIGGER)) {
			continue;
		}

		// // Use seperate code for determining if an item is picked up
		// // so you don't have to actually contact its bounding box.
		// if ( hit->s.eType == ET_ITEM ) {
		// 	if ( !BG_PlayerTouchesItem( &ent->client->ps, &hit->s, level.time ) ) {
		// 		continue;
		// 	}
		// } else {
			if (!sv.EntityContact(mins, maxs, hit)) {
				continue;
			}
		// }

		hit.touch.call(this, hit, ent);
	}

	// if we didn't touch a jump pad this pmove frame
	if (ps.jumppad_frame != ps.pmove_framecount) {
		ps.jumppad_frame = 0;
		ps.jumppad_ent = 0;
	}
}