/**
 * QUAKED trigger_teleport (.5 .5 .5) ? SPECTATOR
 * Allows client side prediction of teleportation events.
 * Must point at a target_position, which will be the teleport destination.
 * 
 * If spectator is set, only spectators can use this teleport
 * Spectator teleporters are not normally placed in the editor, but are created
 * automatically near doors to allow spectators to move through them
 */
spawnFuncs['trigger_teleport'] = function (self) {
	InitTrigger(self);

	// Unlike other triggers, we need to send this one to the client
	// unless is a spectator trigger.
	if (self.spawnflags & 1) {
		self.svFlags |= SVF.NOCLIENT;
	} else {
		self.svFlags &= ~SVF.NOCLIENT;
	}

	// Make sure the client precaches this sound.
	// G_SoundIndex("sound/world/jumppad.wav");

	self.s.eType = ET.TELEPORT_TRIGGER;
	self.touch = TeleportTouch;

	sv.LinkEntity(self);
};

function TeleportTouch(self, other) {
	if (!other.client) {
		return;
	}

	if (other.client.ps.pm_type === PM.DEAD) {
		return;
	}

	var dest = PickTarget(self.target);
	if (!dest) {
		log('Couldn\'t find teleporter destination');
		FreeEntity(self);
		return;
	}

	TeleportPlayer(other, dest.s.origin, dest.s.angles);
}