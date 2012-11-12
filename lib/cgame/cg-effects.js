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
		le.leType = LocalEntityType.SPRITE_EXPLOSION;

		// randomly rotate sprite orientation
		le.refent.rotation = Math.floor(Math.random()*360);
		vec3.scale(dir, 16, tmpVec);
		vec3.add(tmpVec, origin, newOrigin);
	} else {
		le.leType = LocalEntityType.EXPLOSION;
		vec3.set(origin, newOrigin);

		// Set axis with random rotate.
		// if (!dir) {
		//	AxisClear(le.refent.axis);
		// } else {
		// 	var ang = Math.floor(Math.random()*360);
		// 	vec3.set(dir, ex.refent.axis[0] );
		// 	RotateAroundDirection(re.refent.axis, ang);
		// }

		// HACK use autoRotate axis
		AnglesToAxis(cg.autoAngles, le.refent.axis);
	}

	le.startTime = cg.time - offset;
	le.endTime = le.startTime + msec;

	// Bias the time so all shader effects start correctly.
	le.refent.shaderTime = le.startTime / 1000;

	le.refent.hModel = hModel;
	le.refent.customShader = shader;

	console.log('adding bullet', newOrigin[0], newOrigin[1], newOrigin[2], hModel);

	// Set origin.
	vec3.set(newOrigin, le.refent.origin);
	vec3.set(newOrigin, le.refent.oldOrigin);

	le.color[0] = le.color[1] = le.color[2] = 1.0;

	return le;
}