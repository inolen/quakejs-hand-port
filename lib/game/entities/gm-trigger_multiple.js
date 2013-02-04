spawnFuncs['trigger_multiple'] = function (self) {
	self.wait =  SpawnFloat('wait', 0.5);
	self.random = SpawnFloat('random', 0);

	if (self.random >= self.wait && self.wait >= 0) {
		self.random = self.wait - FRAMETIME;
		log('trigger_multiple has random >= wait');
	}

	self.touch = MultiTouch;
	self.use = MultiUse;

	InitTrigger(self);
	SV.LinkEntity(self);
};

/**
 * MultiTouch
 */
function MultiTouch(self, other, trace) {
	if(!other.client) {
		return;
	}

	MultiTrigger(self, other);
}

/**
 * MultiUse
 */
function MultiUse(self, other, activator) {
	MultiTrigger(self, activator);
}

/**
 * MultiTrigger
 *
 * The trigger was just activated.
 * ent.activator should be set to the activator so it can be held through a delay
 * so wait for the delay time before firing.
 */
function MultiTrigger(ent, activator) {
	ent.activator = activator;

	if (ent.nextthink) {
		return;  // can't retrigger until the wait is over
	}

	if (activator.client) {
		if ((ent.spawnflags & 1) &&
			activator.client.sess.sessionTeam !== TEAM.RED) {
			return;
		}
		if ((ent.spawnflags & 2) &&
			activator.client.sess.sessionTeam !== TEAM.BLUE ) {
			return;
		}
	}

	UseTargets(ent, ent.activator);

	if (ent.wait > 0) {
		ent.think = MultiWait;
		ent.nextthink = level.time + (ent.wait + ent.random * QMath.crandom()) * 1000;
	} else {
		// We can't just remove (self) here, because this is a touch function
		// called while looping through area links...
		ent.touch = 0;
		ent.nextthink = level.time + FRAMETIME;
		ent.think = FreeEntity;
	}
}

/**
 * MultiWait
 *
 * The wait time has passed, so set back up for another activation.
 */
function MultiWait(ent) {
	ent.nextthink = 0;
}