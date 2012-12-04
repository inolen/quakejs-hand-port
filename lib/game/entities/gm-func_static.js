entityEvents['func_static'] = {
	spawn: function (self) {
		sv.SetBrushModel(self, self.model);
		InitMover(self);
		vec3.set(self.s.origin, self.s.pos.trBase);
		vec3.set(self.s.origin, self.currentOrigin);
	}
};