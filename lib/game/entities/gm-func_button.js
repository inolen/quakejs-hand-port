/**
 * QUAKED func_button (0 .5 .8) ?
 * When a button is touched, it moves some distance in the direction of its angle, triggers all of its targets, waits some time, then returns to its original position where it can be triggered again.
 *
 * "model2"  .md3 model to also draw
 * "angle"   determines the opening direction
 * "target"  all entities with a matching targetname will be used
 * "speed"   override the default 40 speed
 * "wait"    override the default 1 second wait (-1 = never return)
 * "lip"     override the default 4 pixel lip remaining at end of move
 * "health"  if set, the button must be killed instead of touched
 * "color"   constantLight color
 * "light"   constantLight radius
 */
spawnFuncs['func_button'] = function (self) {
	// self.sound1to2 = G_SoundIndex("sound/movers/switches/butn2.wav");

	if (!self.speed) {
		self.speed = 40;
	}

	if (!self.wait) {
		self.wait = 1;
	}
	self.wait *= 1000;

	// First position
	vec3.set(self.s.origin, self.pos1);

	// Calculate second position.
	sv.SetBrushModel(self, self.model);

	var lip = SpawnFloat('lip', 4);

	SetMovedir(self.s.angles, self.movedir);

	var abs_movedir = vec3.createFrom(
		Math.abs(self.movedir[0]),
		Math.abs(self.movedir[1]),
		Math.abs(self.movedir[2])
	);
	var size = vec3.subtract(self.maxs, self.mins, vec3.create());
	var distance = abs_movedir[0] * size[0] + abs_movedir[1] * size[1] + abs_movedir[2] * size[2] - lip;
	vec3.add(self.pos1, vec3.scale(self.movedir, distance, vec3.create()), self.pos2);

	if (self.health) {
		// Shootable button.
		self.takeDamage = true;
	} else {
		// Touchable button
		self.touch = ButtonTouch;
	}

	InitMover(self);
}


/**
 * ButtonTouch
 */
function ButtonTouch(ent, other, trace) {
	if (!other.client) {
		return;
	}

	if (ent.moverState === MOVER.POS1) {
		UseBinaryMover(ent, other, other);
	}
};