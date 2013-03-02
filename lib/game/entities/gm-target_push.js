spawnFuncs['target_push'] = function (self) {
	if (!self.speed) {
		self.speed = 1000;
	}

	SetMovedir(self.s.angles, self.s.origin2);
	vec3.scale(self.s.origin2, self.speed);

	if (self.spawnflags & 1) {
		self.noise_index = SoundIndex('sound/world/jumppad');
	} else {
		self.noise_index = SoundIndex('sound/misc/windfly');
	}

	if (self.target) {
		vec3.set(self.s.origin, self.r.absmin);
		vec3.set(self.s.origin, self.r.absmax );
		self.think = AimAtTarget;
		self.nextthink = level.time + FRAMETIME;
	}

	self.use = PushUse;
};


function PushUse(self, other, activator) {
	if (!activator.client) {
		return;
	}

	if (activator.client.ps.pm_type !== PM.NORMAL) {
		return;
	}

	if (activator.client.ps.powerups[PW.FLIGHT]) {
		return;
	}

	vec3.set(self.s.origin2, activator.client.ps.velocity);

	// Play fly sound every 1.5 seconds.
	if (activator.flyDebounceTime < level.time) {
		activator.flyDebounceTime = level.time + 1500;
		AddSound(activator, /*CHAN_AUTO,*/ self.noise_index);
	}
}