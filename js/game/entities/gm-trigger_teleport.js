entityEvents['trigger_teleport'] = {
	spawn: function (self) {
		sv.SetBrushModel(self, self.model);

		self.s.eType = EntityType.TELEPORT_TRIGGER;
		self.contents = ContentTypes.TRIGGER;
		
		sv.LinkEntity(self);
	},

	touch: function (self, other) {
		if (!other.client) {
			return;
		}

		if (other.client.ps.pm_type === PmoveType.DEAD) {
			return;
		}

		var dest = EntityPickTarget(self.target);
		if (!dest) {
			console.log('Couldn\'t find teleporter destination');
			FreeEntity(self);
			return;
		}

		TeleportPlayer(other, dest.s.origin, dest.s.angles);
	}
};