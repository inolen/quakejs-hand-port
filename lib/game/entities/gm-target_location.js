/**
 * QUAKED target_location (0 0.5 0) (-8 -8 -8) (8 8 8)
 * Set "message" to the name of this location.
 * Set "count" to 0-7 for color.
 * 0:white 1:red 2:green 3:yellow 4:blue 5:cyan 6:magenta 7:white
 *
 * Closest target_location in sight used for the location, if none
 * in site, closest in distance.
 */
spawnFuncs['target_location'] = function (self) {
	FreeEntity(self);

	// self.think = TargetLocationLinkup;
	// self.nextthink = level.time + 200;  // Let them all spawn first

	// SetOrigin(self, self.s.origin);
}

/**
 * TargetLocationLinkup
 */
function TargetLocationLinkup(ent) {
	// if (level.locationLinked) {
	// 	return;
	// }

	// level.locationLinked = true;
	// level.locationHead = null;

	// // SV.SetConfigstring('locations', 'unknown');

	// for (i = 0, ent = g_entities, n = 1;
	// 		i < level.num_entities;
	// 		i++, ent++) {
	// 	if (ent.classname && ent.classname === 'target_location')) {
	// 		// Lets overload some variables!.
	// 		ent.health = n; // use for location marking
	// 		SV.SetConfigstring('locations:' + n, ent.message);
	// 		n++;
	// 		ent.nextTrain = level.locationHead;
	// 		level.locationHead = ent;
	// 	}
	// }

	// All linked together now
}