/**
 * QUAKED target_teleporter (1 0 0) (-8 -8 -8) (8 8 8)
 * The activator will be teleported away.
 */
spawnFuncs['target_teleporter'] = function (self) {
	if (!self.targetName) {
		log('Untargeted', self.classname, 'at', self.s.origin);
	}

	self.use = TeleporterUse;
};

/**
 * TeleporterUse
 */
function TeleporterUse(self, other, activator) {
	if (!activator.client) {
		return;
	}

	var dest = PickTarget(self.target);
	if (!dest) {
		log('Couldn\'t find teleporter destination');
		return;
	}

	TeleportPlayer(activator, dest.s.origin, dest.s.angles);
}