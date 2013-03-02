/**
 * QUAKED light (0 1 0) (-8 -8 -8) (8 8 8) linear
 * Non-displayed light.
 * "light"  overrides the default 300 intensity.
 * Linear   checkbox gives linear falloff instead of inverse square
 * Lights   pointed at a target will be spotlights.
 * "radius" overrides the default 64 unit radius of a spotlight at the target point.
 */
spawnFuncs['light'] = function (self) {
	FreeEntity(self);
};
