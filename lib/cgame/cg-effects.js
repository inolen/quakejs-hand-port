/**
 * MakeExplosion
 */
function MakeExplosion(origin, dir, hModel, shader, msec, isSprite) {
	if (msec <= 0) {
		error('MakeExplosion: msec = ', msec);
	}

	var le = AllocLocalEntity();
	var newOrigin = vec3.create();
	// Skew the time a bit so they aren't all in sync.
	var offset = Math.floor(Math.random()*64);

	if (isSprite) {
		le.leType = LE.SPRITE_EXPLOSION;

		// Randomly rotate sprite orientation.
		le.refent.rotation = Math.floor(Math.random()*360);
		var tmpVec = vec3.scale(dir, 16, vec3.create());
		vec3.add(tmpVec, origin, newOrigin);
	} else {
		le.leType = LE.EXPLOSION;
		vec3.set(origin, newOrigin);

		// Set axis with random rotate.
		if (!dir) {
			QMath.AxisClear(le.refent.axis);
		} else {
			var ang = Math.floor(Math.random() * 360);

			vec3.set(dir, le.refent.axis[0]);
			QMath.RotateAroundDirection(le.refent.axis, ang);
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

var MARK_TOTAL_TIME = 10000;
var MARK_FADE_TIME = 1000;

function ImpactMark(markShader, origin, dir,
	                orientation, r, g, b, a,
	                alphaFade, radius, temporary) {
	// if (!cg_addMarks.integer) {
	// 	return;
	// }

	if (radius <= 0) {
		error('ImpactMark called with <= 0 radius');
	}

	var refent = new re.RefEntity();

	// Create the texture axis.
	var axis = refent.axis;
	vec3.normalize(dir, axis[0]);
	QMath.PerpendicularVector(axis[0], axis[1]);
	QMath.RotatePointAroundVector(axis[1], axis[0], orientation, axis[2]);
	vec3.cross(axis[0], axis[2], axis[1]);

	// ST scale.
	var texCoordScale = 0.5 * 1.0 / radius;

	// Create the full polygon.
	var originalPoints = [vec3.create(), vec3.create(), vec3.create(), vec3.create()];
	for (var i = 0; i < 3 ; i++) {
		originalPoints[0][i] = origin[i] - radius * axis[1][i] - radius * axis[2][i];
		originalPoints[1][i] = origin[i] + radius * axis[1][i] - radius * axis[2][i];
		originalPoints[2][i] = origin[i] + radius * axis[1][i] + radius * axis[2][i];
		originalPoints[3][i] = origin[i] - radius * axis[1][i] + radius * axis[2][i];
	}

	var colors = [r * 0xff, g * 0xff, b * 0xff, a * 0xff];

	refent.reType = RT.POLY;
	refent.customShader = markShader;

	// Get the fragments.
	var projection = vec3.scale(dir, -20, vec3.create());
	var fragments = re.MarkFragments(originalPoints, projection);

	for (var i = 0; i < fragments.length; i++) {
		var mf = fragments[i];

		// Copy fragment verts over to refent.
		refent.polyVerts = [];

		for (var j = 0; j < mf.length; j++) {
			var vert = new re.PolyVert();

			vec3.set(mf[j], vert.xyz);

			var delta = vec3.subtract(vert.xyz, origin, vec3.create());
			vert.st[0] = 0.5 + vec3.dot(delta, axis[1]) * texCoordScale;
			vert.st[1] = 0.5 + vec3.dot(delta, axis[2]) * texCoordScale;

			vec4.set(colors, vert.modulate);

			refent.polyVerts.push(vert);
		}

		// Temporary marks (e.g. player shadow) don't need to be added
		// as local entities.
		if (temporary) {
			re.AddRefEntityToScene(refent);
			continue;
		}

		// Save it persistantly.
		var le = AllocLocalEntity();
		le.leType = LE.MARK;
		le.startTime = cg.time;
		le.endTime = le.startTime + MARK_TOTAL_TIME;
		le.fadeTime = le.endTime - MARK_FADE_TIME;
		le.alphaFade = alphaFade;
		le.color[0] = r;
		le.color[1] = g;
		le.color[2] = b;
		le.color[3] = a;
		refent.clone(le.refent);
	}
}

/**
 * SpawnEffect
 *
 * Player teleporting in or out.
 */
function SpawnEffect(origin) {
	var le = AllocLocalEntity();
	le.leFlags = 0;
	le.leType = LE.FADE_RGB;
	le.startTime = cg.time;
	le.endTime = cg.time + 500;

	le.color[0] = le.color[1] = le.color[2] = le.color[3] = 1.0;

	var refent = le.refent;
	refent.reType = RT.MODEL;
	refent.shaderTime = cg.time / 1000;
	refent.hModel = cgs.media.teleportEffectModel;
	refent.customShader = cgs.media.teleportEffectShader;
	QMath.AxisClear(refent.axis);
	vec3.set(origin, refent.origin);
	refent.origin[2] -= 24;
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
	               fadeTime,
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
	le.fadeTime = fadeTime;
	le.endTime = startTime + duration;
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

/**
 * GibPlayer
 *
 * Generated a bunch of gibs launching out from the bodies location
 */
var GIB_VELOCITY = 250;
var GIB_JUMP = 250;

function GibPlayer(cent) {
	// if (!cg_blood.integer) {
	// 	return;
	// }

	var origin = vec3.create(cent.lerpOrigin);

	//
	// Start sound.
	//
	snd.StartSound(null, cent.currentState.number, /*CHAN_BODY,*/ cgs.media.gibSound);

	//
	// Create gibs.
	//
	var velocity = vec3.createFrom(
		QMath.crandom() * GIB_VELOCITY,
		QMath.crandom() * GIB_VELOCITY,
		GIB_JUMP + QMath.crandom() * GIB_VELOCITY
	);

	if (Math.floor(Math.random() * 2)) {
		LaunchGib(origin, velocity, cgs.media.gibSkull);
	} else {
		LaunchGib(origin, velocity, cgs.media.gibBrain);
	}

	// // Allow gibs to be turned off for speed.
	// if ( !cg_gibs.integer ) {
	// 	return;
	// }

	velocity[0] = QMath.crandom() * GIB_VELOCITY;
	velocity[1] = QMath.crandom() * GIB_VELOCITY;
	velocity[2] = GIB_JUMP + QMath.crandom() * GIB_VELOCITY;
	LaunchGib(origin, velocity, cgs.media.gibAbdomen);

	velocity[0] = QMath.crandom() * GIB_VELOCITY;
	velocity[1] = QMath.crandom() * GIB_VELOCITY;
	velocity[2] = GIB_JUMP + QMath.crandom() * GIB_VELOCITY;
	LaunchGib(origin, velocity, cgs.media.gibArm);

	velocity[0] = QMath.crandom() * GIB_VELOCITY;
	velocity[1] = QMath.crandom() * GIB_VELOCITY;
	velocity[2] = GIB_JUMP + QMath.crandom() * GIB_VELOCITY;
	LaunchGib(origin, velocity, cgs.media.gibChest);

	velocity[0] = QMath.crandom() * GIB_VELOCITY;
	velocity[1] = QMath.crandom() * GIB_VELOCITY;
	velocity[2] = GIB_JUMP + QMath.crandom() * GIB_VELOCITY;
	LaunchGib(origin, velocity, cgs.media.gibFist);

	velocity[0] = QMath.crandom() * GIB_VELOCITY;
	velocity[1] = QMath.crandom() * GIB_VELOCITY;
	velocity[2] = GIB_JUMP + QMath.crandom() * GIB_VELOCITY;
	LaunchGib(origin, velocity, cgs.media.gibFoot);

	velocity[0] = QMath.crandom() * GIB_VELOCITY;
	velocity[1] = QMath.crandom() * GIB_VELOCITY;
	velocity[2] = GIB_JUMP + QMath.crandom() * GIB_VELOCITY;
	LaunchGib(origin, velocity, cgs.media.gibForearm);

	velocity[0] = QMath.crandom() * GIB_VELOCITY;
	velocity[1] = QMath.crandom() * GIB_VELOCITY;
	velocity[2] = GIB_JUMP + QMath.crandom() * GIB_VELOCITY;
	LaunchGib(origin, velocity, cgs.media.gibIntestine);

	velocity[0] = QMath.crandom() * GIB_VELOCITY;
	velocity[1] = QMath.crandom() * GIB_VELOCITY;
	velocity[2] = GIB_JUMP + QMath.crandom() * GIB_VELOCITY;
	LaunchGib(origin, velocity, cgs.media.gibLeg);

	velocity[0] = QMath.crandom() * GIB_VELOCITY;
	velocity[1] = QMath.crandom() * GIB_VELOCITY;
	velocity[2] = GIB_JUMP + QMath.crandom() * GIB_VELOCITY;
	LaunchGib(origin, velocity, cgs.media.gibLeg);
}

/**
 * LaunchGib
 */
function LaunchGib(origin, velocity, hModel) {
	var le = AllocLocalEntity();
	var refent = le.refent;

	le.leType = LE.FRAGMENT;
	le.startTime = cg.time;
	le.endTime = le.startTime + 5000 + Math.random() * 3000;

	vec3.set(origin, refent.origin);
	QMath.AxisCopy(QMath.axisDefault, refent.axis);
	refent.hModel = hModel;

	le.pos.trType = TR.GRAVITY;
	vec3.set(origin, le.pos.trBase);
	vec3.set(velocity, le.pos.trDelta );
	le.pos.trTime = cg.time;

	le.bounceFactor = 0.6;
	le.leBounceSoundType = LEBS.BLOOD;
	le.leMarkType = LEMT.BLOOD;
}