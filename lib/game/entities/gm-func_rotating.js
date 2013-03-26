spawnFuncs['func_rotating'] = function (ent) {
	if (!ent.speed) {
		ent.speed = 100;
	}

	// Set the axis of rotation.
	ent.s.apos.trType = TR.LINEAR;
	if (ent.spawnflags & 4) {
		ent.s.apos.trDelta[2] = ent.speed;
	} else if (ent.spawnflags & 8) {
		ent.s.apos.trDelta[0] = ent.speed;
	} else {
		ent.s.apos.trDelta[1] = ent.speed;
	}

	if (!ent.damage) {
		ent.damage = 2;
	}

	SV.SetBrushModel(ent, ent.model);
	InitMover(ent);

	vec3.set(ent.s.origin, ent.s.pos.trBase);
	vec3.set(ent.s.pos.trBase, ent.r.currentOrigin);
	vec3.set(ent.s.apos.trBase, ent.r.currentAngles);

	SV.LinkEntity(ent);
}