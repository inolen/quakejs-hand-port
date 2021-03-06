/**
 * QUAKED trigger_push (.5 .5 .5) ?
 * Must point at a target_position, which will be the apex of the leap.
 * This will be client side predicted, unlike target_push
 */
spawnFuncs['trigger_push'] = function (self) {
	InitTrigger(self);

	// Unlike other triggers, we need to send this one to the client.
	self.r.svFlags &= ~SVF.NOCLIENT;

	// Make sure the client precaches this sound.
	SoundIndex('sound/world/jumppad');

	self.s.eType = ET.PUSH_TRIGGER;
	self.touch = PushTouch;
	self.think = AimAtTarget;
	self.nextthink = level.time + FRAMETIME;
	SV.LinkEntity(self);
};

function PushTouch(self, other) {
	if (!other.client) {
		return;
	}

	BG.TouchJumpPad(other.client.ps, self.s);
}