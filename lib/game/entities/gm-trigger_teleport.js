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
		self.r.svFlags |= SVF.NOCLIENT;
	} else {
		self.r.svFlags &= ~SVF.NOCLIENT;
	}

	// Make sure the client precaches this sound.
	SoundIndex('sound/world/jumppad');

	self.s.eType = ET.TELEPORT_TRIGGER;
	self.touch = TeleportTouch;

	SV.LinkEntity(self);
};

function TeleportTouch(self, other) {
	if (!other.client) {
		return;
	}

	if (other.client.ps.pm_type === PM.DEAD) {
		return;
	}

	// If the tele has a valid arena number, change arenas.
	// NOTE: Some maps have an arena num set and a target in error.
	// We let the target take precedence.
	if (!self.target && self.arena !== ARENANUM_NONE) {
		SetArena(other, self.arena);
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