/**
 * InitLocalEntities
 *
 * This is called at startup and for tournement restarts.
 */
function InitLocalEntities() {
	for (var i = 0; i < MAX_LOCAL_ENTITIES; i++) {
		cg.localEntities[i] = new LocalEntity();
		cg.localEntities[i].next = i === MAX_LOCAL_ENTITIES - 1 ? null : cg.localEntities[i+1];
	}

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

			// case LocalEntityType.MARK:
			// 	break;

			// case LocalEntityType.SPRITE_EXPLOSION:
			// 	AddSpriteExplosion(le);
			// 	break;

			case LocalEntityType.EXPLOSION:
				AddExplosion(le);
				break;

			// case LocalEntityType.FRAGMENT:                 // gibs and brass
			// 	AddFragment(le);
			// 	break;

			// case LocalEntityType.MOVE_SCALE_FADE:          // water bubbles
			// 	AddMoveScaleFade(le);
			// 	break;

			// case LocalEntityType.FADE_RGB:                 // teleporters, railtrails
			// 	AddFadeRGB(le);
			// 	break;

			// case LocalEntityType.FALL_SCALE_FADE:          // gib blood trails
			// 	AddFallScaleFade(le);
			// 	break;

			// case LocalEntityType.SCALE_FADE:               // rocket trails
			// 	AddScaleFade(le);
			// 	break;

			// case LocalEntityType.SCOREPLUM:
			// 	AddScorePlum(le);
			// 	break;
		}
	}
}

// /**********************************************************
//  *
//  * FRAGMENT PROCESSING
//  * 
//  * A fragment localentity interacts with the environment in some way (hitting walls),
//  * or generates more localentities along a trail.
//  *
//  **********************************************************/

// /**
//  * BloodTrail
//  * 
//  * Leave expanding blood puffs behind gibs.
//  */
// function BloodTrail(le) {
// 	int		t;
// 	int		t2;
// 	int		step;
// 	vec3_t	newOrigin;
// 	localEntity_t	*blood;

// 	step = 150;
// 	t = step * ( (cg.time - cg.frametime + step ) / step );
// 	t2 = step * ( cg.time / step );

// 	for ( ; t <= t2; t += step ) {
// 		BG_EvaluateTrajectory( &le->pos, t, newOrigin );

// 		blood = CG_SmokePuff( newOrigin, vec3_origin, 
// 					  20,		// radius
// 					  1, 1, 1, 1,	// color
// 					  2000,		// trailTime
// 					  t,		// startTime
// 					  0,		// fadeInTime
// 					  0,		// flags
// 					  cgs.media.bloodTrailShader );
// 		// use the optimized version
// 		blood->leType = LocalEntityType.FALL_SCALE_FADE;
// 		// drop a total of 40 units over its lifetime
// 		blood->pos.trDelta[2] = 40;
// 	}
// }

// /**
//  * FragmentBounceMark
//  */
// function FragmentBounceMark(le, trace) {
// 	int			radius;

// 	if ( le->leMarkType == LEMT_BLOOD ) {

// 		radius = 16 + (rand()&31);
// 		CG_ImpactMark( cgs.media.bloodMarkShader, trace->endpos, trace->plane.normal, random()*360,
// 			1,1,1,1, qtrue, radius, qfalse );
// 	} else if ( le->leMarkType == LEMT_BURN ) {

// 		radius = 8 + (rand()&15);
// 		CG_ImpactMark( cgs.media.burnMarkShader, trace->endpos, trace->plane.normal, random()*360,
// 			1,1,1,1, qtrue, radius, qfalse );
// 	}


// 	// don't allow a fragment to make multiple marks, or they
// 	// pile up while settling
// 	le->leMarkType = LEMT_NONE;
// }

// /**
//  * FragmentBounceSound
//  */
// function FragmentBounceSound(le, trace) {
// 	if ( le->leBounceSoundType == LEBS_BLOOD ) {
// 		// half the gibs will make splat sounds
// 		if ( rand() & 1 ) {
// 			int r = rand()&3;
// 			sfxHandle_t	s;

// 			if ( r == 0 ) {
// 				s = cgs.media.gibBounce1Sound;
// 			} else if ( r == 1 ) {
// 				s = cgs.media.gibBounce2Sound;
// 			} else {
// 				s = cgs.media.gibBounce3Sound;
// 			}
// 			trap_S_StartSound( trace->endpos, sh.ENTITYNUM_WORLD, CHAN_AUTO, s );
// 		}
// 	} else if ( le->leBounceSoundType == LEBS_BRASS ) {

// 	}

// 	// don't allow a fragment to make multiple bounce sounds,
// 	// or it gets too noisy as they settle
// 	le->leBounceSoundType = LEBS_NONE;
// }


// /**
//  * ReflectVelocity
//  */
// function ReflectVelocity(le, trace) {
// 	vec3_t	velocity;
// 	float	dot;
// 	int		hitTime;

// 	// reflect the velocity on the trace plane
// 	hitTime = cg.time - cg.frametime + cg.frametime * trace->fraction;
// 	BG_EvaluateTrajectoryDelta( &le->pos, hitTime, velocity );
// 	dot = DotProduct( velocity, trace->plane.normal );
// 	VectorMA( velocity, -2*dot, trace->plane.normal, le->pos.trDelta );

// 	VectorScale( le->pos.trDelta, le->bounceFactor, le->pos.trDelta );

// 	VectorCopy( trace->endpos, le->pos.trBase );
// 	le->pos.trTime = cg.time;


// 	// check for stop, making sure that even on low FPS systems it doesn't bobble
// 	if ( trace->allsolid || 
// 		( trace->plane.normal[2] > 0 && 
// 		( le->pos.trDelta[2] < 40 || le->pos.trDelta[2] < -cg.frametime * le->pos.trDelta[2] ) ) ) {
// 		le->pos.trType = TR_STATIONARY;
// 	} else {

// 	}
// }

// /**
//  * AddFragment
//  */
// function AddFragment(le) {
// 	vec3_t	newOrigin;
// 	trace_t	trace;

// 	if ( le->pos.trType == TR_STATIONARY ) {
// 		// sink into the ground if near the removal time
// 		int		t;
// 		float	oldZ;
		
// 		t = le->endTime - cg.time;
// 		if ( t < SINK_TIME ) {
// 			// we must use an explicit lighting origin, otherwise the
// 			// lighting would be lost as soon as the origin went
// 			// into the ground
// 			VectorCopy( le->refEntity.origin, le->refEntity.lightingOrigin );
// 			le->refEntity.renderfx |= RF_LIGHTING_ORIGIN;
// 			oldZ = le->refEntity.origin[2];
// 			le->refEntity.origin[2] -= 16 * ( 1.0 - (float)t / SINK_TIME );
// 			trap_R_AddRefEntityToScene( &le->refEntity );
// 			le->refEntity.origin[2] = oldZ;
// 		} else {
// 			trap_R_AddRefEntityToScene( &le->refEntity );
// 		}

// 		return;
// 	}

// 	// calculate new position
// 	BG_EvaluateTrajectory( &le->pos, cg.time, newOrigin );

// 	// trace a line from previous position to new position
// 	CG_Trace( &trace, le->refEntity.origin, NULL, NULL, newOrigin, -1, CONTENTS_SOLID );
// 	if ( trace.fraction == 1.0 ) {
// 		// still in free fall
// 		VectorCopy( newOrigin, le->refEntity.origin );

// 		if ( le->leFlags & LEF_TUMBLE ) {
// 			vec3_t angles;

// 			BG_EvaluateTrajectory( &le->angles, cg.time, angles );
// 			qm.AnglesToAxis( angles, le->refEntity.axis );
// 		}

// 		trap_R_AddRefEntityToScene( &le->refEntity );

// 		// add a blood trail
// 		if ( le->leBounceSoundType == LEBS_BLOOD ) {
// 			CG_BloodTrail( le );
// 		}

// 		return;
// 	}

// 	// if it is in a nodrop zone, remove it
// 	// this keeps gibs from waiting at the bottom of pits of death
// 	// and floating levels
// 	if ( CG_PointContents( trace.endpos, 0 ) & CONTENTS_NODROP ) {
// 		CG_FreeLocalEntity( le );
// 		return;
// 	}

// 	// leave a mark
// 	CG_FragmentBounceMark( le, &trace );

// 	// do a bouncy sound
// 	CG_FragmentBounceSound( le, &trace );

// 	// reflect the velocity on the trace plane
// 	CG_ReflectVelocity( le, &trace );

// 	trap_R_AddRefEntityToScene( &le->refEntity );
// }

// /**********************************************************
//  *
//  * TRIVIAL LOCAL ENTITIES
//  *
//  * These only do simple scaling or modulation before passing to the renderer
//  *
//  **********************************************************/

// /**
//  * AddFadeRGB
//  */
// function AddFadeRGB(le) {
// 	refEntity_t *re;
// 	float c;

// 	re = &le->refEntity;

// 	c = ( le->endTime - cg.time ) * le->lifeRate;
// 	c *= 0xff;

// 	re->shaderRGBA[0] = le->color[0] * c;
// 	re->shaderRGBA[1] = le->color[1] * c;
// 	re->shaderRGBA[2] = le->color[2] * c;
// 	re->shaderRGBA[3] = le->color[3] * c;

// 	trap_R_AddRefEntityToScene( re );
// }

// /**
//  * AddMoveScaleFade
//  */
// function AddMoveScaleFade(le) {
// 	refEntity_t	*re;
// 	float		c;
// 	vec3_t		delta;
// 	float		len;

// 	re = &le->refEntity;

// 	if ( le->fadeInTime > le->startTime && cg.time < le->fadeInTime ) {
// 		// fade / grow time
// 		c = 1.0 - (float) ( le->fadeInTime - cg.time ) / ( le->fadeInTime - le->startTime );
// 	}
// 	else {
// 		// fade / grow time
// 		c = ( le->endTime - cg.time ) * le->lifeRate;
// 	}

// 	re->shaderRGBA[3] = 0xff * c * le->color[3];

// 	if ( !( le->leFlags & LEF_PUFF_DONT_SCALE ) ) {
// 		re->radius = le->radius * ( 1.0 - c ) + 8;
// 	}

// 	BG_EvaluateTrajectory( &le->pos, cg.time, re->origin );

// 	// if the view would be "inside" the sprite, kill the sprite
// 	// so it doesn't add too much overdraw
// 	VectorSubtract( re->origin, cg.refdef.vieworg, delta );
// 	len = VectorLength( delta );
// 	if ( len < le->radius ) {
// 		CG_FreeLocalEntity( le );
// 		return;
// 	}

// 	trap_R_AddRefEntityToScene( re );
// }


// /**
//  * AddScaleFade
//  *
//  * For rocket smokes that hang in place, fade out, and are
//  * removed if the view passes through them.
//  * There are often many of these, so it needs to be simple.
//  */
// function AddScaleFade(le) {
// 	refEntity_t	*re;
// 	float		c;
// 	vec3_t		delta;
// 	float		len;

// 	re = &le->refEntity;

// 	// fade / grow time
// 	c = ( le->endTime - cg.time ) * le->lifeRate;

// 	re->shaderRGBA[3] = 0xff * c * le->color[3];
// 	re->radius = le->radius * ( 1.0 - c ) + 8;

// 	// if the view would be "inside" the sprite, kill the sprite
// 	// so it doesn't add too much overdraw
// 	VectorSubtract( re->origin, cg.refdef.vieworg, delta );
// 	len = VectorLength( delta );
// 	if ( len < le->radius ) {
// 		CG_FreeLocalEntity( le );
// 		return;
// 	}

// 	trap_R_AddRefEntityToScene( re );
// }

// /**
//  * AddFallScaleFade
//  * 
//  * This is just an optimized CG_AddMoveScaleFade
//  * For blood mists that drift down, fade out, and are
//  * removed if the view passes through them.
//  * There are often 100+ of these, so it needs to be simple.
//  */
// function AddFallScaleFade(le) {
// 	refEntity_t	*re;
// 	float		c;
// 	vec3_t		delta;
// 	float		len;

// 	re = &le->refEntity;

// 	// fade time
// 	c = ( le->endTime - cg.time ) * le->lifeRate;

// 	re->shaderRGBA[3] = 0xff * c * le->color[3];

// 	re->origin[2] = le->pos.trBase[2] - ( 1.0 - c ) * le->pos.trDelta[2];

// 	re->radius = le->radius * ( 1.0 - c ) + 16;

// 	// if the view would be "inside" the sprite, kill the sprite
// 	// so it doesn't add too much overdraw
// 	VectorSubtract( re->origin, cg.refdef.vieworg, delta );
// 	len = VectorLength( delta );
// 	if ( len < le->radius ) {
// 		CG_FreeLocalEntity( le );
// 		return;
// 	}

// 	trap_R_AddRefEntityToScene( re );
// }

/**
 * AddExplosion
 */
function AddExplosion(le) {
	var refent = le.refent;

	// Add the entity.
	imp.re_AddRefEntityToScene(refent);

	// Add the dlight.
	// if (le.light) {
	// 	float light;

	// 	light = (float)( cg.time - ex->startTime ) / ( ex->endTime - ex->startTime );
	// 	if ( light < 0.5 ) {
	// 		light = 1.0;
	// 	} else {
	// 		light = 1.0 - ( light - 0.5 ) * 2;
	// 	}
	// 	light = ex->light * light;
	// 	trap_R_AddLightToScene(ent->origin, light, ex->lightColor[0], ex->lightColor[1], ex->lightColor[2] );
	// }
}

// /**
//  * AddSpriteExplosion
//  */
// function AddSpriteExplosion(le) {
// 	refEntity_t	re;
// 	float c;

// 	re = le->refEntity;

// 	c = ( le->endTime - cg.time ) / ( float ) ( le->endTime - le->startTime );
// 	if ( c > 1 ) {
// 		c = 1.0;	// can happen during connection problems
// 	}

// 	imp.re_shaderRGBA[0] = 0xff;
// 	imp.re_shaderRGBA[1] = 0xff;
// 	imp.re_shaderRGBA[2] = 0xff;
// 	imp.re_shaderRGBA[3] = 0xff * c * 0.33;

// 	imp.re_reType = RT_SPRITE;
// 	imp.re_radius = 42 * ( 1.0 - c ) + 30;

// 	trap_R_AddRefEntityToScene( &re );

// 	// add the dlight
// 	if ( le->light ) {
// 		float		light;

// 		light = (float)( cg.time - le->startTime ) / ( le->endTime - le->startTime );
// 		if ( light < 0.5 ) {
// 			light = 1.0;
// 		} else {
// 			light = 1.0 - ( light - 0.5 ) * 2;
// 		}
// 		light = le->light * light;
// 		trap_R_AddLightToScene(imp.re_origin, light, le->lightColor[0], le->lightColor[1], le->lightColor[2] );
// 	}
// }

// /**
//  * AddScorePlum
//  */
// var NUMBER_SIZE = 8;

// function AddScorePlum(le) {
// 	refEntity_t	*re;
// 	vec3_t		origin, delta, dir, vec, up = {0, 0, 1};
// 	float		c, len;
// 	int			i, score, digits[10], numdigits, negative;

// 	re = &le->refEntity;

// 	c = ( le->endTime - cg.time ) * le->lifeRate;

// 	score = le->radius;
// 	if (score < 0) {
// 		re->shaderRGBA[0] = 0xff;
// 		re->shaderRGBA[1] = 0x11;
// 		re->shaderRGBA[2] = 0x11;
// 	}
// 	else {
// 		re->shaderRGBA[0] = 0xff;
// 		re->shaderRGBA[1] = 0xff;
// 		re->shaderRGBA[2] = 0xff;
// 		if (score >= 50) {
// 			re->shaderRGBA[1] = 0;
// 		} else if (score >= 20) {
// 			re->shaderRGBA[0] = re->shaderRGBA[1] = 0;
// 		} else if (score >= 10) {
// 			re->shaderRGBA[2] = 0;
// 		} else if (score >= 2) {
// 			re->shaderRGBA[0] = re->shaderRGBA[2] = 0;
// 		}

// 	}
// 	if (c < 0.25)
// 		re->shaderRGBA[3] = 0xff * 4 * c;
// 	else
// 		re->shaderRGBA[3] = 0xff;

// 	re->radius = NUMBER_SIZE / 2;

// 	VectorCopy(le->pos.trBase, origin);
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

// 	negative = qfalse;
// 	if (score < 0) {
// 		negative = qtrue;
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
// 		VectorMA(origin, (float) (((float) numdigits / 2) - i) * NUMBER_SIZE, vec, re->origin);
// 		re->customShader = cgs.media.numberShaders[digits[numdigits-1-i]];
// 		trap_R_AddRefEntityToScene( re );
// 	}
// }