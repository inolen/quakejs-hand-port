/**
 * QUAKED trigger_hurt (.5 .5 .5) ? START_OFF - SILENT NO_PROTECTION SLOW
 * Any entity that touches this will be hurt.
 * It does dmg points of damage each server frame
 * Targeting the trigger will toggle its on / off state.
 *
 * SILENT         supresses playing the sound
 * SLOW	          changes the damage rate to once per second
 * NO_PROTECTION  *nothing* stops the damage
 * 
 * "dmg"          default 5 (whole numbers only)
 */
spawnFuncs['trigger_hurt'] = function (self) {
	InitTrigger(self);

	self.touch = HurtTouch;
	self.use = HurtUse;

	// self.noise_index = G_SoundIndex( "sound/world/electro.wav" );

	if (!self.damage) {
		self.damage = 5;
	}

	// Link in to the world if starting active.
	if (self.spawnflags & 1) {
		sv.UnlinkEntity(self);
	}
	else {
		sv.LinkEntity(self);
	}
};

function HurtTouch(self, other) {
	if (self.timestamp > level.time) {
		return;
	}

	if (self.spawnflags & 16) {
		self.timestamp = level.time + 1000;
	} else {
		self.timestamp = level.time + FRAMETIME;
	}

	// Just respawn the player for now.
	ClientSpawn(other);
};

function HurtUse(self, other, activator) {
	if (self.linked ) {
		sv.UnlinkEntity(self);
	} else {
		sv.LinkEntity(self);
	}
}
