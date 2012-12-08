spawnFuncs['target_push'] = function (self) {
	if (!self.speed) {
		self.speed = 1000;
	}

	SetMovedir(self.s.angles, self.origin2);
	vec3.scale(self.s.origin2);

	/*if ( self->spawnflags & 1 ) {
		self->noise_index = G_SoundIndex("sound/world/jumppad.wav");
	} else {
		self->noise_index = G_SoundIndex("sound/misc/windfly.wav");
	}*/

	if (self.target) {
		vec3.set(self.s.origin, self.absmin);
		vec3.set(self.s.origin, self.absmax );
		self.think = AimAtTarget;
		self.nextthink = level.time + FRAMETIME;
	}
};