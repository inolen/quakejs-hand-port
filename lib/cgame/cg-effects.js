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
 * ImpactMark
 *
 * origin should be a point within a unit of the plane
 * dir should be the plane normal
 *
 * temporary marks will not be stored or randomly oriented, but immediately
 * passed to the renderer.
 */
var MAX_MARK_FRAGMENTS = 128;
var MAX_MARK_POINTS = 384;

function ImpactMark(markShader, origin, dir, 
	                orientation, r, g, b, a,
	                alphaFade, radius, temporary) {
	// if (!cg_addMarks.integer) {
	// 	return;
	// }

	if (radius <= 0) {
		error('ImpactMark called with <= 0 radius');
	}

	var le, refent;

	if (!temporary) {
		le = AllocLocalEntity();
		le.leType = LE.MARK;
		le.startTime = cg.time;
		le.endTime = le.startTime + 4000;
		le.color[0] = r;
		le.color[1] = g;
		le.color[2] = b;
		le.color[3] = a;

		refent = le.refent;
	} else {
		refent = new re.RefEntity();
	}

	// Create the texture axis.
	var axis = refent.axis;
	vec3.normalize(dir, axis[0]);
	QMath.PerpendicularVector(axis[0], axis[1]);
	// RotatePointAroundVector(axis[2], axis[0], axis[1], orientation);
	vec3.cross(axis[0], axis[1], axis[2]);

	// Create the full polygon.
	var originalPoints = [[0, 0, 0], [0, 0, 0], [0, 0, 0], [0, 0, 0]];
	for (var i = 0; i < 3 ; i++) {
		originalPoints[0][i] = origin[i] - radius * axis[1][i] - radius * axis[2][i];
		originalPoints[1][i] = origin[i] + radius * axis[1][i] - radius * axis[2][i];
		originalPoints[2][i] = origin[i] + radius * axis[1][i] + radius * axis[2][i];
		originalPoints[3][i] = origin[i] - radius * axis[1][i] + radius * axis[2][i];
	}

	var colors = [r * 0xff, g * 0xff, b * 0xff, a * 0xff];

	refent.reType = RT.POLY;
	refent.customShader = markShader;

	vec3.set(originalPoints[0], refent.polyVerts[0].xyz);
	refent.polyVerts[0].st = [0, 0];
	refent.polyVerts[0].modulate = colors;

	vec3.set(originalPoints[1], refent.polyVerts[1].xyz);
	refent.polyVerts[1].st = [1, 0];
	refent.polyVerts[1].modulate = colors;

	vec3.set(originalPoints[2], refent.polyVerts[2].xyz);
	refent.polyVerts[2].st = [1, 1];
	refent.polyVerts[2].modulate = colors;

	vec3.set(originalPoints[3], refent.polyVerts[3].xyz);
	refent.polyVerts[3].st = [0, 1];
	refent.polyVerts[3].modulate = colors;

	refent.numPolyVerts = 4;

	if (temporary) {
		re.AddRefEntityToScene(refent);
	}

	// Get the fragments.
	// vec3.scale(dir, -20, projection);
	// numFragments = trap_CM_MarkFragments( 4, (void *)originalPoints,
	// 				projection, MAX_MARK_POINTS, markPoints[0],
	// 				MAX_MARK_FRAGMENTS, markFragments );

	// colors[0] = red * 255;
	// colors[1] = green * 255;
	// colors[2] = blue * 255;
	// colors[3] = alpha * 255;

	// for ( i = 0, mf = markFragments ; i < numFragments ; i++, mf++ ) {
	// 	polyVert_t	*v;
	// 	polyVert_t	verts[MAX_VERTS_ON_POLY];
	// 	markPoly_t	*mark;

	// 	// we have an upper limit on the complexity of polygons
	// 	// that we store persistantly
	// 	if ( mf.numPoints > MAX_VERTS_ON_POLY ) {
	// 		mf.numPoints = MAX_VERTS_ON_POLY;
	// 	}
	// 	for ( j = 0, v = verts ; j < mf.numPoints ; j++, v++ ) {
	// 		vec3_t		delta;

	// 		VectorCopy( markPoints[mf.firstPoint + j], v.xyz );

	// 		VectorSubtract( v.xyz, origin, delta );
	// 		v.st[0] = 0.5 + DotProduct( delta, axis[1] ) * texCoordScale;
	// 		v.st[1] = 0.5 + DotProduct( delta, axis[2] ) * texCoordScale;
	// 		*(int *)v.modulate = *(int *)colors;
	// 	}

	// 	// if it is a temporary (shadow) mark, add it immediately and forget about it
	// 	if ( temporary ) {
	// 		trap_R_AddPolyToScene( markShader, mf.numPoints, verts );
	// 		continue;
	// 	}

	// 	// otherwise save it persistantly
	// 	mark = CG_AllocMark();
	// 	mark.time = cg.time;
	// 	mark.alphaFade = alphaFade;
	// 	mark.markShader = markShader;
	// 	mark.poly.numVerts = mf.numPoints;
	// 	mark.color[0] = red;
	// 	mark.color[1] = green;
	// 	mark.color[2] = blue;
	// 	mark.color[3] = alpha;
	// 	memcpy( mark.verts, verts, mf.numPoints * sizeof( verts[0] ) );
	// 	markTotal++;
	// }
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
	var le = AllocLocalEntity();
	le.leFlags = leFlags;
	le.radius = radius;

	var refent = le.refent;
	refent.rotation = Math.random() * 360; //Q_random( &seed ) * 360;
	refent.radius = radius;
	refent.shaderTime = startTime / 1000;

	le.leType = LE.MOVE_SCALE_FADE;
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

	var refent = le.refent;
	vec3.set(origin, refent.origin);
	refent.reType = RT.SPRITE;
	refent.rotation = Math.floor(Math.random() * 360);
	refent.radius = 24;
	refent.customShader = cgs.media.bloodExplosionShader;

	// Don't show player's own blood in view.
	if (entityNum === cg.snap.ps.clientNum) {
		refent.renderfx |= RF.THIRD_PERSON;
	}
}