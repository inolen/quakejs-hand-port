spawnFuncs['func_static'] = function (self) {
	SV.SetBrushModel(self, self.model);
	InitMover(self);
	vec3.set(self.s.origin, self.s.pos.trBase);
	vec3.set(self.s.origin, self.r.currentOrigin);
};