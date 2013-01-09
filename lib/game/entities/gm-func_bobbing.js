/**
 * QUAKED func_bobbing (0 .5 .8) ? X_AXIS Y_AXIS
 * Normally bobs on the Z axis
 * "model2"	.md3 model to also draw
 * "height"	amplitude of bob (32 default)
 * "speed"		seconds to complete a bob cycle (4 default)
 * "phase"		the 0.0 to 1.0 offset in the cycle to start at
 * "dmg"		damage to inflict when blocked (2 default)
 * "color"		constantLight color
 * "light"		constantLight radius
 */
spawnFuncs['func_bobbing'] = function (self) {
	var height = SpawnFloat('height', 32);
	var phase = SpawnFloat('phase', 0);

	self.speed = SpawnFloat('speed', 4);
	self.damage = SpawnInt('dmg', 2);

	sv.SetBrushModel(self, self.model);
	InitMover(self);

	vec3.set(self.s.origin, self.s.pos.trBase);
	vec3.set(self.s.origin, self.currentOrigin);

	self.s.pos.trDuration = self.speed * 1000;
	self.s.pos.trTime = self.s.pos.trDuration * phase;
	self.s.pos.trType = TR.SINE;

	// Set the axis of bobbing.
	if (self.spawnflags & 1) {
		self.s.pos.trDelta[0] = height;
	} else if (self.spawnflags & 2) {
		self.s.pos.trDelta[1] = height;
	} else {
		self.s.pos.trDelta[2] = height;
	}
}