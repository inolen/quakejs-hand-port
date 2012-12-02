var MISSILE_PRESTEP_TIME = 50;

/**
 * RunMissile
 */
function RunMissile(ent) {
	// Get current position.
	var origin = [0, 0, 0];
	bg.EvaluateTrajectory(ent.s.pos, level.time, origin);

	// Trace a line from the previous position to the current position.
	var tr = sv.Trace(ent.currentOrigin, origin, ent.mins, ent.maxs, ent.ownerNum, ent.clipmask);
	if (tr.startSolid || tr.allSolid) {
		// Make sure the tr.entityNum is set to the entity we're stuck in.
		tr = sv.Trace(ent.currentOrigin, ent.currentOrigin, ent.mins, ent.maxs, ent.ownerNum, ent.clipmask);
		tr.fraction = 0;
	} else {
		vec3.set(tr.endPos, ent.currentOrigin);
	}

	sv.LinkEntity(ent);

	if (tr.fraction !== 1) {
		// Never explode or bounce on sky.
		if (tr.surfaceFlags & SURF.NOIMPACT) {
			// // If grapple, reset owner.
			// if (ent.parent && ent.parent.client && ent.parent.client.hook == ent) {
			// 	ent.parent.client.hook = NULL;
			// }
			FreeEntity(ent);
			return;
		}
		
		MissileImpact(ent, tr);

		if (ent.s.eType !== ET.MISSILE) {
			return;  // exploded
		}
	}

	// Check think function after bouncing.
	RunEntity(ent);
}

/**
 * MissileImpact
 */
function MissileImpact(ent, trace) {
	var other = level.gentities[trace.entityNum];
	var hitClient = false;

	// Check for bounce.
	// if (!other.takeDamage &&
	// 	(ent.s.eFlags & (EF.BOUNCE | EF.BOUNCE_HALF))) {
	// 	BounceMissile(ent, trace);
	// 	AddEvent(ent, EV.GRENADE_BOUNCE, 0);
	// 	return;
	// }

	// Impact damage.
	if (other.takeDamage) {
		// FIXME: wrong damage direction?
		if (ent.damage) {
			var velocity = [0, 0, 0];

			if (LogAccuracyHit(other, level.gentities[ent.ownerNum])) {
				level.gentities[ent.ownerNum].client.accuracy_hits++;
				hitClient = true;
			}

			bg.EvaluateTrajectoryDelta(ent.s.pos, level.time, velocity);
			if (vec3.length(velocity) === 0) {
				velocity[2] = 1;  // stepped on a grenade
			}
			
			Damage(other, ent, level.gentities[ent.ownerNum], velocity,
				ent.s.origin, ent.damage, 0, ent.methodOfDeath);
		}
	}

	// if (!strcmp(ent.classname, "hook")) {
	// 	gentity_t *nent;
	// 	vec3_t v;

	// 	nent = G_Spawn();
	// 	if ( other.takeDamage && other.client ) {

	// 		G_AddEvent( nent, EV_MISSILE_HIT, DirToByte( trace.plane.normal ) );
	// 		nent.s.otherEntityNum = other.s.number;

	// 		ent.enemy = other;

	// 		v[0] = other.currentOrigin[0] + (other.mins[0] + other.maxs[0]) * 0.5;
	// 		v[1] = other.currentOrigin[1] + (other.mins[1] + other.maxs[1]) * 0.5;
	// 		v[2] = other.currentOrigin[2] + (other.mins[2] + other.maxs[2]) * 0.5;

	// 		SnapVectorTowards( v, ent.s.pos.trBase );	// save net bandwidth
	// 	} else {
	// 		VectorCopy(trace.endPos, v);
	// 		G_AddEvent( nent, EV_MISSILE_MISS, DirToByte( trace.plane.normal ) );
	// 		ent.enemy = NULL;
	// 	}

	// 	SnapVectorTowards( v, ent.s.pos.trBase );	// save net bandwidth

	// 	nent.freeAfterEvent = qtrue;
	// 	// change over to a normal entity right at the point of impact
	// 	nent.s.eType = ET_GENERAL;
	// 	ent.s.eType = ET_GRAPPLE;

	// 	G_SetOrigin( ent, v );
	// 	G_SetOrigin( nent, v );

	// 	ent.think = Weapon_HookThink;
	// 	ent.nextthink = level.time + FRAMETIME;

	// 	ent.parent.client.ps.pm_flags |= PMF_GRAPPLE_PULL;
	// 	VectorCopy( ent.currentOrigin, ent.parent.client.ps.grapplePoint);

	// 	trap_LinkEntity( ent );
	// 	trap_LinkEntity( nent );

	// 	return;
	// }

	// Is it cheaper in bandwidth to just remove this ent and create a new
	// one, rather than changing the missile into the explosion?
	if (other.takeDamage && other.client) {
		AddEvent(ent, EV.MISSILE_HIT, QMath.DirToByte(trace.plane.normal));
		ent.s.otherEntityNum = other.s.number;
	} else if (trace.surfaceFlags & SURF.METALSTEPS) {
		AddEvent(ent, EV.MISSILE_MISS_METAL, QMath.DirToByte(trace.plane.normal));
	} else {
		AddEvent(ent, EV.MISSILE_MISS, QMath.DirToByte(trace.plane.normal));
	}

	ent.freeAfterEvent = true;

	// Change over to a normal entity right at the point of impact
	ent.s.eType = ET.GENERAL;

	// SnapVectorTowards(trace.endPos, ent.s.pos.trBase );  // save net bandwidth

	SetOrigin(ent, trace.endPos);

	// Splash damage (doesn't apply to person directly hit).
	if (ent.splashDamage) {
		if (RadiusDamage(trace.endPos, ent.parent, ent.splashDamage, ent.splashRadius, other, ent.splashMethodOfDeath)) {
			if (!hitClient) {
				level.gentities[ent.ownerNum].client.accuracy_hits++;
			}
		}
	}

	sv.LinkEntity(ent);
}

/**
 * ExplodeMissile
 *
 * Explode a missile without an impact
 */
function ExplodeMissile(ent) {
	var origin = [0, 0, 0];
	// We don't have a valid direction, so just point straight up.
	var dir = [0, 0, 1];

	bg.EvaluateTrajectory(ent.s.pos, level.time, origin);
	// SnapVector(origin);
	SetOrigin(ent, origin);

	ent.s.eType = ET.GENERAL;
	ent.freeAfterEvent = true;
	AddEvent(ent, EV.MISSILE_MISS, DirToByte(dir));

	// Splash damage
	// if (ent.splashDamage) {
	// 	if (G_RadiusDamage( ent.currentOrigin, ent.parent, ent.splashDamage, ent.splashRadius, ent, ent.splashMethodOfDeath ) ) {
	// 		g_entities[ent.ownerNum].client.accuracy_hits++;
	// 	}
	// }

	sv.LinkEntity(ent);
}

/**
 * FireRocket
 */
function FireRocket(self, start, dir) {
	var rocket = SpawnEntity();
	rocket.classname = 'rocket';
	rocket.nextthink = level.time + 15000;
	rocket.think = ExplodeMissile;
	rocket.s.eType = ET.MISSILE;
	rocket.svFlags = SVF.USE_CURRENT_ORIGIN;
	rocket.s.weapon = WP.ROCKET_LAUNCHER;
	rocket.ownerNum = self.s.number;
	rocket.parent = self;
	rocket.damage = 100;
	rocket.splashDamage = 100;
	rocket.splashRadius = 120;
	rocket.methodOfDeath = MOD.ROCKET;
	rocket.splashMethodOfDeath = MOD.ROCKET_SPLASH;
	rocket.clipmask = MASK.SHOT;

	rocket.s.pos.trType = TR.LINEAR;
	rocket.s.pos.trTime = level.time - MISSILE_PRESTEP_TIME;  // move a bit on the very first frame
	vec3.set(start, rocket.s.pos.trBase);
	vec3.normalize(dir);
	vec3.scale(dir, 900, rocket.s.pos.trDelta);
	// SnapVector( rocket.s.pos.trDelta );  // save net bandwidth
	vec3.set(start, rocket.currentOrigin);

	return rocket;
}