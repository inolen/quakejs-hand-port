/**
 * MakeExplosion
 */
function MakeExplosion(origin, dir, hModel, shader, msec, isSprite) {
	if (msec <= 0) {
		error('MakeExplosion: msec = ', msec);
	}

	var le = AllocLocalEntity();
	var tmpVec = [0, 0, 0];
	var newOrigin = [0, 0, 0];
	// Skew the time a bit so they aren't all in sync.
	var offset = Math.floor(Math.random()*64);

	if (isSprite) {
		le.leType = LE.SPRITE_EXPLOSION;

		// randomly rotate sprite orientation
		le.refent.rotation = Math.floor(Math.random()*360);
		vec3.scale(dir, 16, tmpVec);
		vec3.add(tmpVec, origin, newOrigin);
	} else {
		le.leType = LE.EXPLOSION;
		vec3.set(origin, newOrigin);

		// Set axis with random rotate.
		if (!dir) {
			qm.AxisClear(le.refent.axis);
		} else {
			var axis = le.refent.axis;
			vec3.set(dir, axis[0]);
			qm.PerpendicularVector(axis[0], axis[1]);
			vec3.cross(axis[0], axis[1], axis[2]);
			// TODO Use this to generate axis[1] and axis[2]
			// rotated by ang.
			// var ang = Math.floor(Math.random()*360);
			// RotateAroundDirection(le.refent.axis, ang);
		}
	}

	le.startTime = cg.time - offset;
	le.endTime = le.startTime + msec;

	// Bias the time so all shader effects start correctly.
	le.refent.shaderTime = le.startTime / 1000;

	le.refent.hModel = hModel;
	le.refent.customShader = shader;

	// Set origin.
	vec3.set(newOrigin, le.refent.origin);
	vec3.set(newOrigin, le.refent.oldOrigin);

	le.color[0] = le.color[1] = le.color[2] = 1.0;

	return le;
}