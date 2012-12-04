entityEvents['trigger_teleport'] = {
	spawn: function (self) {
		sv.SetBrushModel(self, self.model);

		self.s.eType = ET.TELEPORT_TRIGGER;
		self.contents = CONTENTS.TRIGGER;
		
		sv.LinkEntity(self);
	},

	touch: function (self, other) {
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
};