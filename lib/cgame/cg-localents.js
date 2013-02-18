/**
 * InitLocalEntities
 *
 * This is called at startup and for tournement restarts.
 */
function InitLocalEntities() {
	cg.localEntities = new Array(MAX_LOCAL_ENTITIES);
	for (var i = MAX_LOCAL_ENTITIES - 1; i >= 0; i--) {
		cg.localEntities[i] = new LocalEntity();
		cg.localEntities[i].idx = i;
		cg.localEntities[i].next = i === MAX_LOCAL_ENTITIES - 1 ? null : cg.localEntities[i+1];
	}

	cg.activeLocalEntities = new LocalEntity();
	cg.activeLocalEntities.next = cg.activeLocalEntities;
	cg.activeLocalEntities.prev = cg.activeLocalEntities;
	cg.freeLocalEntities = cg.localEntities[0];
}

/**
 * AllocLocalEntity
 *
 * Will allways succeed, even if it requires freeing an old active entity.
 */
function AllocLocalEntity() {
	if (!cg.freeLocalEntities) {
		// No free entities, so free the one at the end of the chain
		// remove the oldest active entity
		FreeLocalEntity(cg.activeLocalEntities.prev);
	}

	var le = cg.freeLocalEntities;
	cg.freeLocalEntities = cg.freeLocalEntities.next;

	le.reset();

	// Link into the active list.
	le.next = cg.activeLocalEntities.next;
	le.prev = cg.activeLocalEntities;
	cg.activeLocalEntities.next.prev = le;
	cg.activeLocalEntities.next = le;
	return le;
}

/**
 * FreeLocalEntity
 */
function FreeLocalEntity(le) {
	if (!le.prev) {
		error('FreeLocalEntity: not active');
	}

	// Remove from the doubly linked active list.
	le.prev.next = le.next;
	le.next.prev = le.prev;

	// The free list is only singly linked.
	le.next = cg.freeLocalEntities;
	cg.freeLocalEntities = le;
}

/**
 * AddLocalEntities
 */
function AddLocalEntities() {
	var le, next;

	// Walk the list backwards, so any new local entities generated
	// (trails, marks, etc) will be present this frame.
	le = cg.activeLocalEntities.prev;
	for (; le != cg.activeLocalEntities; le = next) {
		// Grab next now, so if the local entity is freed we
		// still have it.
		next = le.prev;

		if (cg.time >= le.endTime) {
			FreeLocalEntity(le);
			continue;
		}

		switch (le.leType) {
			// default:
			// 	error('Bad leType: ', le.leType);
			// 	break;

			case LE.MARK:
				AddMark(le);
				break;

			case LE.EXPLOSION:
				AddExplosion(le);
				break;

			case LE.SPRITE_EXPLOSION:
				AddSpriteExplosion(le);
				break;

			case LE.FRAGMENT:                 // gibs and brass
				AddFragment(le);
				break;

			case LE.MOVE_SCALE_FADE:          // water bubbles
				AddMoveScaleFade(le);
				break;

			case LE.FADE_RGB:                 // teleporters, railtrails
				AddFadeRGB(le);
				break;

			case LE.FALL_SCALE_FADE:          // gib blood trails
				AddFallScaleFade(le);
				break;

			case LE.SCALE_FADE:               // rocket trails
				AddScaleFade(le);
				break;

			// case LE.SCOREPLUM:
			// 	AddScorePlum(le);
			// 	break;
		}
	}
}

/**********************************************************
 *
 * FRAGMENT PROCESSING
 *
 * A fragment localentity interacts with the environment in some way (hitting walls),
 * or generates more localentities along a trail.
 *
 **********************************************************/

/**
 * AddFragment
 */
function AddFragment(le) {
	var refent = le.refent;
	var trace = new QS.TraceResults();

	// Sink into the ground if near the removal time.
	if (le.pos.trType === TR.STATIONARY) {
		var t = le.endTime - cg.time;
		if (t < SINK_TIME) {
			// We must use an explicit lighting origin, otherwise the
			// lighting would be lost as soon as the origin went
			// into the ground
			vec3.set(refent.origin, refent.lightingOrigin);
			refent.renderfx |= RF.LIGHTING_ORIGIN;
			var oldZ = refent.origin[2];
			refent.origin[2] -= 16 * (1.0 - t / SINK_TIME);
			RE.AddRefEntityToScene(refent);
			refent.origin[2] = oldZ;
		} else {
			RE.AddRefEntityToScene(refent);
		}

		return;
	}

	// Calculate new position.
	var newOrigin = vec3.create();
	BG.EvaluateTrajectory(le.pos, cg.time, newOrigin);

	// Trace a line from previous position to new position.
	Trace(trace, refent.origin, newOrigin, null, null, -1, SURF.CONTENTS.SOLID);

	if (trace.fraction === 1.0) {
		// Still in free fall.
		vec3.set(newOrigin, refent.origin);

		if (le.leFlags & LEF.TUMBLE) {
			var angles = vec3.createFrom(0, 0 , 0);

			BG.EvaluateTrajectory(le.angles, cg.time, angles);
			QMath.AnglesToAxis(angles, refent.axis);
		}

		RE.AddRefEntityToScene(refent);

		// Add a blood trail
		if (le.leBounceSoundType === LEBS.BLOOD) {
			BloodTrail(le);
		}

		return;
	}

	// If it is in a nodrop zone, remove it.
	// This keeps gibs from waiting at the bottom of pits of death
	// and floating levels.
	if (PointContents(trace.endPos, 0) & SURF.CONTENTS.NODROP) {
		FreeLocalEntity(le);
		return;
	}

	// Leave a mark.
	FragmentBounceMark(le, trace);

	// Do a bouncy sound.
	FragmentBounceSound(le, trace);

	// Reflect the velocity on the trace plane.
	ReflectVelocity(le, trace);

	RE.AddRefEntityToScene(refent);
}

/**
 * BloodTrail
 *
 * Leave expanding blood puffs behind gibs.
 */
function BloodTrail(le) {
	var step = 150;
	var t = step * Math.floor((cg.time - cg.frameTime + step) / step);
	var t2 = step * Math.floor(cg.time / step);
	var newOrigin = vec3.create();

	for (; t <= t2; t += step) {
		BG.EvaluateTrajectory(le.pos, t, newOrigin);

		var blood = SmokePuff(newOrigin, QMath.vec3origin,
		              20,          // radius
		              1, 1, 1, 1,  // color
		              2000,        // trailTime
		              t,           // startTime
		              0,           // fadeTime
		              0,           // flags
		              cgs.media.bloodTrailShader);

		// Use the optimized version.
		blood.leType = LE.FALL_SCALE_FADE;

		// Drop a total of 40 units over its lifetime.
		blood.pos.trDelta[2] = 40;
	}
}

/**
 * FragmentBounceMark
 */
function FragmentBounceMark(le, trace) {
	if (le.leMarkType === LEMT.BLOOD) {
		var radius = 16 + QMath.irrandom(0, 31);
		ImpactMark(cgs.media.bloodMarkShader, trace.endPos, trace.plane.normal, QMath.rrandom(0, 360),
			1, 1, 1, 1, true, radius, false);
	} else if (le.leMarkType === LEMT.BURN) {
		var radius = 8 + QMath.irrandom(0, 15);
		ImpactMark(cgs.media.burnMarkShader, trace.endPos, trace.plane.normal, QMath.rrandom(0, 360),
			1, 1, 1, 1, true, radius, false);
	}

	// Don't allow a fragment to make multiple marks, or they
	// pile up while settling.
	le.leMarkType = LEMT.NONE;
}

/**
 * FragmentBounceSound
 */
function FragmentBounceSound(le, trace) {
	if (le.leBounceSoundType === LEBS.BLOOD) {
		// Half the gibs will make splat sounds.
		if (QMath.irrandom(0, 1)) {
			var r = QMath.irrandom(0, 2);
			var s;
			if (r === 0) {
				s = cgs.media.gibBounce1Sound;
			} else if (r === 1) {
				s = cgs.media.gibBounce2Sound;
			} else {
				s = cgs.media.gibBounce3Sound;
			}
			SND.StartSound(trace.endPos, -1/*ENTITYNUM_WORLD*/,/*, CHAN_AUTO,*/ s);
		}
	} else if (le.leBounceSoundType === LEBS.BRASS) {
		// Nothing.
	}

	// Don't allow a fragment to make multiple bounce sounds,
	// or it gets too noisy as they settle.
	le.leBounceSoundType = LEBS.NONE;
}


/**
 * ReflectVelocity
 */
function ReflectVelocity(le, trace) {
	// Reflect the velocity on the trace plane.
	var hitTime = cg.time - cg.frameTime + cg.frameTime * trace.fraction;

	var velocity = vec3.create();
	BG.EvaluateTrajectoryDelta(le.pos, hitTime, velocity);

	vec3.set(trace.endPos, le.pos.trBase);

	var dot = vec3.dot(velocity, trace.plane.normal);
	vec3.add(velocity, vec3.scale(trace.plane.normal, -2*dot, vec3.create()), le.pos.trDelta);
	vec3.scale(le.pos.trDelta, le.bounceFactor);

	le.pos.trTime = cg.time;

	// Check for stop, making sure that even on low FPS systems it doesn't bobble.
	if (trace.allSolid ||
		(trace.plane.normal[2] > 0 &&
		(le.pos.trDelta[2] < 40 || le.pos.trDelta[2] < -cg.frameTime * le.pos.trDelta[2]))) {
		le.pos.trType = TR.STATIONARY;
	}
}

// /**********************************************************
//  *
//  * TRIVIAL LOCAL ENTITIES
//  *
//  * These only do simple scaling or modulation before passing to the renderer
//  *
//  **********************************************************/

/**
 * AddFadeRGB
 */
function AddFadeRGB(le) {
	var refent = le.refent;

	var f = (le.endTime - cg.time) / (le.endTime - le.startTime);

	refent.shaderRGBA[0] = le.color[0] * f;
	refent.shaderRGBA[1] = le.color[1] * f;
	refent.shaderRGBA[2] = le.color[2] * f;
	refent.shaderRGBA[3] = le.color[3] * f;

	RE.AddRefEntityToScene(refent);
}

/**
 * AddMoveScaleFade
 */
function AddMoveScaleFade(le) {
	var refent = le.refent;

	// Fade / grow time.
	var f;
	if (le.fadeTime > le.startTime && cg.time < le.fadeTime) {
		f = 1.0 - (le.fadeTime - cg.time) / (le.fadeTime - le.startTime);
	} else {
		f = (le.endTime - cg.time) / (le.endTime - le.startTime);
	}

	refent.shaderRGBA[3] = le.color[3] * f;

	if (!(le.leFlags & LEF.PUFF_DONT_SCALE)) {
		refent.radius = le.radius * (1.0 - f) + 8;
	}

	BG.EvaluateTrajectory(le.pos, cg.time, refent.origin);

	// If the view would be "inside" the sprite, kill the sprite
	// so it doesn't add too much overdraw
	var delta = vec3.subtract(refent.origin, cg.refdef.vieworg, vec3.create());
	var len = vec3.length(delta);
	if (len < le.radius) {
		FreeLocalEntity(le);
		return;
	}

	RE.AddRefEntityToScene(refent);
}


/**
 * AddScaleFade
 *
 * For rocket smokes that hang in place, fade out, and are
 * removed if the view passes through them.
 * There are often many of these, so it needs to be simple.
 */
function AddScaleFade(le) {
	var refent = le.refent;

	// Fade / grow time
	var f = (le.endTime - cg.time) / (le.endTime - le.startTime);

	refent.shaderRGBA[3] = le.color[3] * f;
	refent.radius = le.radius * (1.0 - f) + 8;

	// If the view would be "inside" the sprite, kill the sprite
	// so it doesn't add too much overdraw.
	var delta = vec3.subtract(refent.origin, cg.refdef.vieworg, vec3.create());
	var len = vec3.length(delta);
	if (len < le.radius) {
		FreeLocalEntity(le);
		return;
	}

	RE.AddRefEntityToScene(refent);
}

/**
 * AddFallScaleFade
 *
 * This is just an optimized AddMoveScaleFade.
 * For blood mists that drift down, fade out, and are
 * removed if the view passes through them.
 * There are often 100+ of these, so it needs to be simple.
 */
function AddFallScaleFade(le) {
	var refent = le.refent;

	// Fade time.
	var f = (le.endTime - cg.time) / (le.endTime - le.startTime);

	refent.shaderRGBA[3] = le.color[3] * f;
	refent.origin[2] = le.pos.trBase[2] - (1.0 - f) * le.pos.trDelta[2];
	refent.radius = le.radius * (1.0 - f) + 16;

	// If the view would be "inside" the sprite, kill the sprite
	// so it doesn't add too much overdraw.
	var delta = vec3.subtract(refent.origin, cg.refdef.vieworg, vec3.create());
	var len = vec3.length(delta);
	if (len < le.radius) {
		FreeLocalEntity(le);
		return;
	}

	RE.AddRefEntityToScene(refent);
}

/**
 * AddMark
 */
function AddMark(le) {
	var refent = le.refent;

	// Fade out the energy bursts
	// var alphaFade = (mark === cgs.media.energyMarkShader);  // plasma fades alpha, all others fade color

	// 	fade = 450 - 450 * ( (cg.time - mp.time ) / 3000.0 );
	// 	if ( fade < 255 ) {
	// 		if ( fade < 0 ) {
	// 			fade = 0;
	// 		}
	// 		if ( mp.verts[0].modulate[0] != 0 ) {
	// 			for ( j = 0 ; j < mp.poly.numVerts ; j++ ) {
	// 				mp.verts[j].modulate[0] = mp.color[0] * fade;
	// 				mp.verts[j].modulate[1] = mp.color[1] * fade;
	// 				mp.verts[j].modulate[2] = mp.color[2] * fade;
	// 			}
	// 		}
	// 	}
	// }

	// Fade all marks out with time.
	var f = (le.endTime - cg.time) / (le.endTime - le.fadeTime);
	if (f > 1.0) {
		f = 1.0;
	}

	if (le.alphaFade) {
		for (var i = 0; i < refent.polyVerts.length; i++) {
			refent.polyVerts[i].modulate[3] = f;
		}
	} else {
		for (var i = 0; i < refent.polyVerts.length; i++) {
			refent.polyVerts[i].modulate[0] = le.color[0] * f;
			refent.polyVerts[i].modulate[1] = le.color[1] * f;
			refent.polyVerts[i].modulate[2] = le.color[2] * f;
		}
	}

	RE.AddRefEntityToScene(refent);
}

/**
 * AddExplosion
 */
function AddExplosion(le) {
	var refent = le.refent;

	// Add the entity.
	RE.AddRefEntityToScene(refent);

	// Add the dlight.
	if (le.light) {
		var light = (cg.time - le.startTime) / (le.endTime - le.startTime);
		if (light < 0.5) {
			light = 1.0;
		} else {
			light = 1.0 - (light - 0.5) * 2;
		}
		light = le.light * light;

		RE.AddLightToScene(refent.origin, light, le.lightColor[0], le.lightColor[1], le.lightColor[2] );
	}
}

/**
 * AddSpriteExplosion
 */
function AddSpriteExplosion(le) {
	var refent = le.refent;

	var f = (le.endTime - cg.time) / (le.endTime - le.startTime);
	if (f > 1) {
		f = 1.0;  // Can happen during connection problems.
	}

	refent.shaderRGBA[0] = 1.0;
	refent.shaderRGBA[1] = 1.0;
	refent.shaderRGBA[2] = 1.0;
	refent.shaderRGBA[3] = 0.33 * f;

	refent.reType = RT.SPRITE;
	refent.radius = 42 * (1.0 - f) + 30;

	RE.AddRefEntityToScene(refent);

	// Add the dlight.
	if (le.light) {
		var light = (cg.time - le.startTime) / (le.endTime - le.startTime);
		if (light < 0.5) {
			light = 1.0;
		} else {
			light = 1.0 - (light - 0.5) * 2;
		}
		light = le.light * light;
		RE.AddLightToScene(refent.origin, light, le.lightColor[0], le.lightColor[1], le.lightColor[2]);
	}
}

// /**
//  * AddScorePlum
//  */
// var NUMBER_SIZE = 8;

// function AddScorePlum(le) {
// 	refEntity_t	*re;
// 	vec3_t		origin, delta, dir, vec, up = {0, 0, 1};
// 	float		c, len;
// 	int			i, score, digits[10], numdigits, negative;

// 	re = &le.refEntity;

// 	c = ( le.endTime - cg.time ) * le.lifeRate;

// 	score = le.radius;
// 	if (score < 0) {
// 		RE.shaderRGBA[0] = 0xff;
// 		RE.shaderRGBA[1] = 0x11;
// 		RE.shaderRGBA[2] = 0x11;
// 	}
// 	else {
// 		RE.shaderRGBA[0] = 0xff;
// 		RE.shaderRGBA[1] = 0xff;
// 		RE.shaderRGBA[2] = 0xff;
// 		if (score >= 50) {
// 			RE.shaderRGBA[1] = 0;
// 		} else if (score >= 20) {
// 			RE.shaderRGBA[0] = RE.shaderRGBA[1] = 0;
// 		} else if (score >= 10) {
// 			RE.shaderRGBA[2] = 0;
// 		} else if (score >= 2) {
// 			RE.shaderRGBA[0] = RE.shaderRGBA[2] = 0;
// 		}

// 	}
// 	if (c < 0.25)
// 		RE.shaderRGBA[3] = 0xff * 4 * c;
// 	else
// 		RE.shaderRGBA[3] = 0xff;

// 	RE.radius = NUMBER_SIZE / 2;

// 	VectorCopy(le.pos.trBase, origin);
// 	origin[2] += 110 - c * 100;

// 	VectorSubtract(cg.refdef.vieworg, origin, dir);
// 	CrossProduct(dir, up, vec);
// 	VectorNormalize(vec);

// 	VectorMA(origin, -10 + 20 * sin(c * 2 * M_PI), vec, origin);

// 	// if the view would be "inside" the sprite, kill the sprite
// 	// so it doesn't add too much overdraw
// 	VectorSubtract( origin, cg.refdef.vieworg, delta );
// 	len = VectorLength( delta );
// 	if ( len < 20 ) {
// 		CG_FreeLocalEntity( le );
// 		return;
// 	}

// 	negative = false;
// 	if (score < 0) {
// 		negative = true;
// 		score = -score;
// 	}

// 	for (numdigits = 0; !(numdigits && !score); numdigits++) {
// 		digits[numdigits] = score % 10;
// 		score = score / 10;
// 	}

// 	if (negative) {
// 		digits[numdigits] = 10;
// 		numdigits++;
// 	}

// 	for (i = 0; i < numdigits; i++) {
// 		VectorMA(origin, (float) (((float) numdigits / 2) - i) * NUMBER_SIZE, vec, RE.origin);
// 		RE.customShader = cgs.media.numberShaders[digits[numdigits-1-i]];
// 		trap_R_AddRefEntityToScene( re );
// 	}
// }