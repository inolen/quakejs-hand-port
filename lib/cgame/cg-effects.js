/**
 * MakeExplosion
 */
function MakeExplosion(origin, dir, hModel, shader, msec, isSprite) {
	if (msec <= 0) {
		error('MakeExplosion: msec = ', msec);
	}

	var le = AllocLocalEntity();
	var newOrigin = [0, 0, 0];
	// Skew the time a bit so they aren't all in sync.
	var offset = Math.floor(Math.random()*64);

	if (isSprite) {
		le.leType = LE.SPRITE_EXPLOSION;

		// Randomly rotate sprite orientation.
		le.refent.rotation = Math.floor(Math.random()*360);
		var tmpVec = vec3.scale(dir, 16, [0, 0, 0]);
		vec3.add(tmpVec, origin, newOrigin);
	} else {
		le.leType = LE.EXPLOSION;
		vec3.set(origin, newOrigin);

		// Set axis with random rotate.
		if (!dir) {
			QMath.AxisClear(le.refent.axis);
		} else {
			var axis = le.refent.axis;
			vec3.set(dir, axis[0]);
			QMath.PerpendicularVector(axis[0], axis[1]);
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

/**
 * SmokePuff
 * 
 * Adds a smoke puff or blood trail localEntity.
 */
function SmokePuff(p, vel,
	               radius,
	               r, g, b, a,
	               duration,
	               startTime,
	               fadeInTime,
	               leFlags,
	               hShader) {
	// static int	seed = 0x92;
	var le = AllocLocalEntity();
	le.leFlags = leFlags;
	le.radius = radius;

	var refent = le.refent;
	refent.rotation = Math.random() * 360; //Q_random( &seed ) * 360;
	refent.radius = radius;
	refent.shaderTime = startTime / 1000;

	le.leType = LE.SCALE_FADE;
	le.startTime = startTime;
	le.fadeInTime = fadeInTime;
	le.endTime = startTime + duration;
	if (fadeInTime > startTime) {
		le.lifeRate = 1.0 / (le.endTime - le.fadeInTime);
	} else {
		le.lifeRate = 1.0 / (le.endTime - le.startTime);
	}
	le.color[0] = r;
	le.color[1] = g; 
	le.color[2] = b;
	le.color[3] = a;

	le.pos.trType = TR.LINEAR;
	le.pos.trTime = startTime;
	vec3.set(vel, le.pos.trDelta);
	vec3.set(p, le.pos.trBase);

	vec3.set(p, refent.origin);
	refent.customShader = hShader;

	refent.shaderRGBA[0] = le.color[0] * 0xff;
	refent.shaderRGBA[1] = le.color[1] * 0xff;
	refent.shaderRGBA[2] = le.color[2] * 0xff;
	refent.shaderRGBA[3] = 0xff;

	refent.reType = RT.SPRITE;
	refent.radius = le.radius;

	return le;
}

/**
 * Bleed
 * 
 * This is the spurt of blood when a character gets hit
 */
function Bleed(origin, entityNum) {
	// if ( !cg_blood.integer ) {
	// 	return;
	// }

	var le = AllocLocalEntity();
	le.leType = LE.EXPLOSION;

	le.startTime = cg.time;
	le.endTime = le.startTime + 500;

	vec3.set(origin, le.refent.origin);
	le.refent.reType = RT.SPRITE;
	le.refent.rotation = Math.floor(Math.random() * 360);
	le.refent.radius = 24;
	le.refent.customShader = cgs.media.bloodExplosionShader;

	// Don't show player's own blood in view.
	if (entityNum === cg.snap.ps.clientNum) {
		le.refent.renderfx |= RF.THIRD_PERSON;
	}
}