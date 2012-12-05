/**
 * QUAKED path_corner (.5 .3 0) (-8 -8 -8) (8 8 8)
 * Train path corners.
 * Target: next path corner and other targets to fire
 * "speed" speed to move to the next corner
 * "wait" seconds to wait before behining move to next corner
 */
spawnFuncs['path_corner'] = function (self) {
	if (!self.targetname) {
		log('path_corner with no targetname at', self.s.origin);
		FreeEntity(self);
		return;
	}
	// path corners don't need to be linked in
};
