var MISSILE_PRESTEP_TIME = 50;

/**
 * RunMissile
 */
function RunMissile(ent) {
	// Get current position.
	var origin = vec3.create();
	bg.EvaluateTrajectory(ent.s.pos, level.time, origin);

	// Trace a line from the previous position to the current position.
	var tr = sv.Trace(ent.r.currentOrigin, origin, ent.r.mins, ent.r.maxs, ent.s.arenaNum, ent.r.ownerNum, ent.clipmask);
	if (tr.startSolid || tr.allSolid) {
		// Make sure the tr.entityNum is set to the entity we're stuck in.
		tr = sv.Trace(ent.r.currentOrigin, ent.r.currentOrigin, ent.r.mins, ent.r.maxs, ent.s.arenaNum, ent.r.ownerNum, ent.clipmask);
		tr.fraction = 0;
	} else {
		vec3.set(tr.endPos, ent.r.currentOrigin);
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
	if (!other.takeDamage && (ent.s.eFlags & (EF.BOUNCE | EF.BOUNCE_HALF))) {
		BounceMissile(ent, trace);
		AddEvent(ent, EV.GRENADE_BOUNCE, 0);
		return;
	}

	// Impact damage.
	if (other.takeDamage) {
		// FIXME: wrong damage direction?
		if (ent.damage) {
			var velocity = vec3.create();

			if (LogAccuracyHit(other, level.gentities[ent.r.ownerNum])) {
				level.gentities[ent.r.ownerNum].client.accuracy_hits++;
				hitClient = true;
			}

			bg.EvaluateTrajectoryDelta(ent.s.pos, level.time, velocity);
			if (vec3.length(velocity) === 0) {
				velocity[2] = 1;  // stepped on a grenade
			}

			Damage(other, ent, level.gentities[ent.r.ownerNum], velocity,
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

	// 		v[0] = other.r.currentOrigin[0] + (other.r.mins[0] + other.r.maxs[0]) * 0.5;
	// 		v[1] = other.r.currentOrigin[1] + (other.r.mins[1] + other.r.maxs[1]) * 0.5;
	// 		v[2] = other.r.currentOrigin[2] + (other.r.mins[2] + other.r.maxs[2]) * 0.5;

	// 		SnapVectorTowards( v, ent.s.pos.trBase );	// save net bandwidth
	// 	} else {
	// 		VectorCopy(trace.endPos, v);
	// 		G_AddEvent( nent, EV_MISSILE_MISS, DirToByte( trace.plane.normal ) );
	// 		ent.enemy = NULL;
	// 	}

	// 	SnapVectorTowards( v, ent.s.pos.trBase );	// save net bandwidth

	// 	nent.freeAfterEvent = true;
	// 	// change over to a normal entity right at the point of impact
	// 	nent.s.eType = ET_GENERAL;
	// 	ent.s.eType = ET_GRAPPLE;

	// 	G_SetOrigin( ent, v );
	// 	G_SetOrigin( nent, v );

	// 	ent.think = Weapon_HookThink;
	// 	ent.nextthink = level.time + FRAMETIME;

	// 	ent.parent.client.ps.pm_flags |= PMF_GRAPPLE_PULL;
	// 	VectorCopy( ent.r.currentOrigin, ent.parent.client.ps.grapplePoint);

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

	// Change over to a normal entity right at the point of impact.
	ent.s.eType = ET.GENERAL;

	// SnapVectorTowards(trace.endPos, ent.s.pos.trBase );  // save net bandwidth

	SetOrigin(ent, trace.endPos);

	// Splash damage (doesn't apply to person directly hit).
	if (ent.splashDamage) {
		if (RadiusDamage(trace.endPos, ent, ent.parent, ent.splashDamage, ent.splashRadius, other, ent.splashMethodOfDeath)) {
			if (!hitClient) {
				level.gentities[ent.r.ownerNum].client.accuracy_hits++;
			}
		}
	}

	sv.LinkEntity(ent);
}

/**
 * BounceMissile
 */
function BounceMissile(ent, trace) {
	var velocity = vec3.create();
	var dot;
	var hitTime;

	// reflect the velocity on the trace plane
	hitTime = level.previousTime + (level.time - level.previousTime) * trace.fraction;
	bg.EvaluateTrajectoryDelta(ent.s.pos, hitTime, velocity);
	dot = vec3.dot(velocity, trace.plane.normal);
	vec3.add(velocity, vec3.scale(trace.plane.normal, (-2 * dot), vec3.create()), ent.s.pos.trDelta);

	if (ent.s.eFlags & EF.BOUNCE_HALF) {
		vec3.scale(ent.s.pos.trDelta, 0.65, ent.s.pos.trDelta);
		// check for stop
		if (trace.plane.normal[2] > 0.2 && vec3.length(ent.s.pos.trDelta) < 40) {
			SetOrigin(ent, trace.endPos);
			ent.s.time = level.time / 4;
			return;
		}
	}

	vec3.add(ent.r.currentOrigin, trace.plane.normal, ent.r.currentOrigin);
	vec3.set(ent.r.currentOrigin, ent.s.pos.trBase);
	ent.s.pos.trTime = level.time;
}

/**
 * ExplodeMissile
 *
 * Explode a missile without an impact
 */
function ExplodeMissile(ent) {
	var origin = vec3.create();
	// We don't have a valid direction, so just point straight up.
	var dir = vec3.createFrom(0, 0, 1);

	bg.EvaluateTrajectory(ent.s.pos, level.time, origin);
	// SnapVector(origin);
	SetOrigin(ent, origin);

	ent.s.eType = ET.GENERAL;
	ent.freeAfterEvent = true;
	AddEvent(ent, EV.MISSILE_MISS, QMath.DirToByte(dir));

	// Splash damage
	if (ent.splashDamage) {
		if (RadiusDamage(ent.r.currentOrigin, ent, ent.parent, ent.splashDamage, ent.splashRadius, ent, ent.splashMethodOfDeath)) {
			level.gentities[ent.r.ownerNum].client.accuracy_hits++;
		}
	}

	sv.LinkEntity(ent);
}

/**
 * FireRocket
 */
function FireRocket(self, start, dir) {
	var rocket = SpawnEntity(self.s.arenaNum);
	rocket.classname = 'rocket';
	rocket.nextthink = level.time + 15000;
	rocket.think = ExplodeMissile;
	rocket.s.eType = ET.MISSILE;
	rocket.r.svFlags = SVF.USE_CURRENT_ORIGIN;
	rocket.s.weapon = WP.ROCKET_LAUNCHER;
	rocket.r.ownerNum = self.s.number;
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
	vec3.set(start, rocket.r.currentOrigin);

	return rocket;
}

/**
 * FireGrenade
 */
function FireGrenade (self, start, dir) {
	var grenade = SpawnEntity(self.s.arenaNum);

	grenade.classname = 'grenade';
	grenade.nextthink = level.time + 2500;
	grenade.think = ExplodeMissile;
	grenade.s.eType = ET.MISSILE;
	grenade.r.svFlags = SVF.USE_CURRENT_ORIGIN;
	grenade.s.weapon = WP.GRENADE_LAUNCHER;
	grenade.s.eFlags = EF.BOUNCE_HALF;
	grenade.r.ownerNum = self.s.number;
	grenade.parent = self;
	grenade.damage = 100;
	grenade.splashDamage = 100;
	grenade.splashRadius = 150;
	grenade.methodOfDeath = MOD.GRENADE;
	grenade.splashMethodOfDeath = MOD.GRENADE_SPLASH;
	grenade.clipmask = MASK.SHOT;
// 	grenade.target_ent = null;

	grenade.s.pos.trType = TR.GRAVITY;
	grenade.s.pos.trTime = level.time - MISSILE_PRESTEP_TIME;  // move a bit on the very first frame
	vec3.set(start, grenade.s.pos.trBase);
	vec3.normalize(dir);
	vec3.scale(dir, 700, grenade.s.pos.trDelta);
// 	SnapVector(grenade.s.pos.trDelta);  // save net bandwidth

	vec3.set(start, grenade.r.currentOrigin);

	return grenade;
}

/**
 * FirePlasma
 */
function FirePlasma (self, start, dir) {
	var bolt = SpawnEntity(self.s.arenaNum);

	bolt.classname = 'plasma';
	bolt.nextthink = level.time + 10000;
	bolt.think = ExplodeMissile;
	bolt.s.eType = ET.MISSILE;
	bolt.r.svFlags = SVF.USE_CURRENT_ORIGIN;
	bolt.s.weapon = WP.PLASMAGUN;
	bolt.r.ownerNum = self.s.number;
	bolt.parent = self;
	bolt.damage = 20;
	bolt.splashDamage = 15;
	bolt.splashRadius = 20;
	bolt.methodOfDeath = MOD.PLASMA;
	bolt.splashMethodOfDeath = MOD.PLASMA_SPLASH;
	bolt.clipmask = MASK.SHOT;
// 	bolt.target_ent = null;

	bolt.s.pos.trType = TR.LINEAR;
	bolt.s.pos.trTime = level.time - MISSILE_PRESTEP_TIME;		// move a bit on the very first frame
	vec3.set(start, bolt.s.pos.trBase);
	vec3.normalize(dir);
	vec3.scale(dir, 2000, bolt.s.pos.trDelta);
// 	SnapVector(bolt.s.pos.trDelta);			// save net bandwidth

	vec3.set(start, bolt.r.currentOrigin);

	return bolt;
}

/**
 * FireBFG
 */
function FireBFG (self, start, dir) {
	var bolt = SpawnEntity(self.s.arenaNum);

	bolt.classname = 'bfg';
	bolt.nextthink = level.time + 10000;
	bolt.think = ExplodeMissile;
	bolt.s.eType = ET.MISSILE;
	bolt.r.svFlags = SVF.USE_CURRENT_ORIGIN;
	bolt.s.weapon = WP.BFG;
	bolt.r.ownerNum = self.s.number;
	bolt.parent = self;
	bolt.damage = 100;
	bolt.splashDamage = 100;
	bolt.splashRadius = 120;
	bolt.methodOfDeath = MOD.BFG;
	bolt.splashMethodOfDeath = MOD.BFG_SPLASH;
	bolt.clipmask = MASK.SHOT;
// 	bolt.target_ent = null;

	bolt.s.pos.trType = TR.LINEAR;
	bolt.s.pos.trTime = level.time - MISSILE_PRESTEP_TIME;		// move a bit on the very first frame
	vec3.set(start, bolt.s.pos.trBase);
	vec3.normalize(dir);
	vec3.scale(dir, 2000, bolt.s.pos.trDelta);
// 	SnapVector(bolt.s.pos.trDelta);			// save net bandwidth

	vec3.set(start, bolt.r.currentOrigin);

	return bolt;
}
