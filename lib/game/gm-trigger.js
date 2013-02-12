/**
 * InitTrigger
 */
function InitTrigger(self) {
	if (!vec3.equal(self.s.angles, QMath.vec3origin)) {
		SetMovedir(self.s.angles, self.movedir);
	}

	SV.SetBrushModel(self, self.model);
	self.r.contents = CONTENTS.TRIGGER;  // replaces the -1 from trap_SetBrushModel
	self.r.svFlags = SVF.NOCLIENT;
}

/**
 * AimAtTarget
 */
function AimAtTarget(self) {
	var origin = vec3.add(self.r.absmin, self.r.absmax, vec3.create());
	vec3.scale(origin, 0.5);

	var ent = PickTarget(self.target);
	if (!ent) {
		FreeEntity(self);
		return;
	}

	var height = ent.s.origin[2] - origin[2];
	var gravity = g_gravity.get();
	var time = Math.sqrt(height / (0.5 * gravity));
	if (!time) {
		FreeEntity(self);
		return;
	}

	// set s.origin2 to the push velocity
	vec3.subtract(ent.s.origin, origin, self.s.origin2 );
	self.s.origin2[2] = 0;

	var dist = vec3.length(self.s.origin2);
	vec3.normalize(self.s.origin2);

	var forward = dist / time;
	vec3.scale(self.s.origin2, forward);

	self.s.origin2[2] = time * gravity;
}