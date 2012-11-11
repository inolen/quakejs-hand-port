entityEvents['trigger_push'] = {
	spawn: function (self) {
		sv.SetBrushModel(self, self.model);

		self.s.eType = EntityType.PUSH_TRIGGER;
		self.contents = ContentTypes.TRIGGER;
		self.nextthink = level.time + FRAMETIME;
		
		sv.LinkEntity(self);
	},

	think: function (self) {
		AimAtTarget(self);
	},

	touch: function (self, other) {
		if (!other.client) {
			return;
		}

		bg.TouchJumpPad(other.client.ps, self.s);
	}
};