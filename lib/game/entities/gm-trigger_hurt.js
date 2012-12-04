entityEvents['trigger_hurt'] = {
	spawn: function (self) {
		sv.SetBrushModel(self, self.model);

		self.s.eType = ET.PUSH_TRIGGER;
		self.contents = CONTENTS.TRIGGER;

		if (self.damage) {
			self.damage = 5;
		}
		
		sv.LinkEntity(self);
	},

	touch: function (self, other) {
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
	}
};