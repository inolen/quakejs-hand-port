var MACHINEGUN_SPREAD      = 200;
var MACHINEGUN_DAMAGE      = 7;
var MACHINEGUN_TEAM_DAMAGE = 5;  // wimpier MG in teamplay

/**
 * FireWeapon
 */
function FireWeapon(ent) {
	var client = ent.client;

	// Track shots taken for accuracy tracking. Grapple is not a weapon and gauntet is just not tracked.
	if (ent.s.weapon !== WP.GRAPPLING_HOOK && ent.s.weapon !== WP.GAUNTLET) {
		client.accuracy_shots++;
	}

	// Fire the specific weapon.
	switch (ent.s.weapon) {
		case WP.GAUNTLET:
			// This is predicted.
			break;
		case WP.LIGHTNING:
			LightningFire(ent);
			break;
		case WP.SHOTGUN:
			ShotgunFire(ent);
			break;
		case WP.MACHINEGUN:
			if (g_gametype() !== GT.TEAM) {
				BulletFire(ent, MACHINEGUN_SPREAD, MACHINEGUN_DAMAGE, MOD.MACHINEGUN);
			} else {
				BulletFire(ent, MACHINEGUN_SPREAD, MACHINEGUN_TEAM_DAMAGE, MOD.MACHINEGUN);
			}
			break;
		case WP.GRENADE_LAUNCHER:
			GrenadeLauncherFire(ent);
			break;
		case WP.ROCKET_LAUNCHER:
			RocketLauncherFire(ent);
			break;
		case WP.PLASMAGUN:
			PlasmagunFire(ent);
			break;
		case WP.RAILGUN:
			RailgunFire(ent);
			break;
		case WP.BFG:
			BFGFire(ent);
			break;
		case WP.GRAPPLING_HOOK:
		//	GrapplingHookFire(ent);
			break;
		default:
			break;
	}
}

/**
 * CalcMuzzlePoint
 *
 * Set muzzle location relative to pivoting eye.
 */
function CalcMuzzlePoint(ent, forward, muzzlePoint) {
	vec3.set(ent.s.pos.trBase, muzzlePoint);
	muzzlePoint[2] += ent.client.ps.viewheight;
	vec3.add(muzzlePoint, vec3.scale(forward, 14, vec3.create()));
	// Snap to integer coordinates for more efficient network bandwidth usage.
	// SnapVector(muzzlePoint);
}

/**
 * QuadFactor
 */
function QuadFactor(ent) {
	var client = ent.client;

	if (client.ps.powerups[PW.QUAD]) {
		return g_quadfactor();
	}

	return 1;
}

/**********************************************************
 *
 * Gauntlet
 *
 **********************************************************/

/**
 * GauntletAttack
 */
function CheckGauntletAttack(ent) {
	if (ent.client.noclip) {
		return false;
	}

	// Set aiming directions.
	var muzzle = vec3.create();
	var forward = vec3.create();

	QMath.AnglesToVectors(ent.client.ps.viewangles, forward, null, null);
	CalcMuzzlePoint(ent, forward, muzzle);

	// See if we impact with an entity.
	var end = vec3.add(vec3.scale(forward, 32, vec3.create()), muzzle);
	var tr = Trace(muzzle, end, null, null, ent.s.number, MASK.SHOT);

	if (tr.surfaceFlags & SURF.NOIMPACT) {
		return false;
	}

	var traceEnt = level.gentities[tr.entityNum];

	// Send blood impact.
	if (traceEnt.takeDamage && traceEnt.client) {
		var tent = TempEntity(tr.endPos, EV.MISSILE_HIT);
		tent.s.otherEntityNum = traceEnt.s.number;
		tent.s.eventParm = QMath.DirToByte(tr.plane.normal);
		tent.s.weapon = ent.s.weapon;
	}

	if (!traceEnt.takeDamage) {
		return false;
	}

	if (ent.client.ps.powerups[PW.QUAD]) {
		AddEvent(ent, EV.POWERUP_QUAD, 0);
	}

	var damage = 50 * QuadFactor(ent);

	Damage(traceEnt, ent, ent, forward, tr.endPos, damage, 0, MOD.GAUNTLET);

	return true;
}

/**********************************************************
 *
 * Machinegun
 *
 **********************************************************/

/**
 * BulletFire
 */
function BulletFire(ent, spread, damage, mod) {
	// Set aiming directions.
	var muzzle = vec3.create();
	var forward = vec3.create();
	var right = vec3.create();
	var up = vec3.create();

	QMath.AnglesToVectors(ent.client.ps.viewangles, forward, right, up);
	CalcMuzzlePoint(ent, forward, muzzle);

	damage *= QuadFactor(ent);

	var r = Math.random() * Math.PI * 2;
	var u = Math.sin(r) * QMath.crandom() * spread * 16;
	r = Math.cos(r) * QMath.crandom() * spread * 16;

	var end = vec3.add(muzzle, vec3.scale(forward, 8192*16, vec3.create()), vec3.create());
	vec3.add(end, vec3.scale(right, r, vec3.create()));
	vec3.add(end, vec3.scale(up, u, vec3.create()));

	var passent = ent.s.number;

	for (var i = 0; i < 10; i++) {
		var tr = Trace(muzzle, end, null, null, passent, MASK.SHOT);

		if (tr.surfaceFlags & SURF.NOIMPACT) {
			return;
		}

		var traceEnt = level.gentities[tr.entityNum];

		// Snap the endpos to integers, but nudged towards the line.
		// SnapVectorTowards(tr.endPos, muzzle);

		// Send bullet impact.
		var tent;
		if (traceEnt.takeDamage && traceEnt.client) {
			tent = TempEntity(tr.endPos, EV.BULLET_HIT_FLESH);
			tent.s.eventParm = traceEnt.s.number;
			if (LogAccuracyHit(traceEnt, ent)) {
				ent.client.accuracy_hits++;
			}
		} else {
			tent = TempEntity(tr.endPos, EV.BULLET_HIT_WALL);
			tent.s.eventParm = QMath.DirToByte(tr.plane.normal);
		}
		tent.s.otherEntityNum = ent.s.number;

		if (traceEnt.takeDamage) {
			Damage(traceEnt, ent, ent, forward, tr.endPos, damage, 0, mod);
		}

		break;
	}
}

/**********************************************************
 *
 * Shotgun
 *
 **********************************************************/

// DEFAULT_SHOTGUN_SPREAD and DEFAULT_SHOTGUN_COUNT	are in bg_public.h, because
// client predicts same spreads
var DEFAULT_SHOTGUN_DAMAGE = 10;

/**
 * ShotgunFire
 */
function ShotgunFire(ent) {
	// Set aiming directions.
	var muzzle = vec3.create();
	var forward = vec3.create();

	QMath.AnglesToVectors(ent.client.ps.viewangles, forward, null, null);
	CalcMuzzlePoint(ent, forward, muzzle);

	// Send shotgun blast.
	var tent = TempEntity(muzzle, EV.SHOTGUN);
	vec3.scale(forward, 4096, tent.s.origin2);
// 	sv.SnapVector(tent.s.origin2);
	tent.s.eventParm = QMath.irrandom(0, 255);  // seed for spread pattern
	tent.s.otherEntityNum = ent.s.number;

	ShotgunPattern(tent.s.pos.trBase, tent.s.origin2, tent.s.eventParm, ent);
}

/**
 * ShotgunPattern
 *
 * This should match CG_ShotgunPattern.
 */
function ShotgunPattern(origin, origin2, seed, ent) {
	var r, u;
	var end     = vec3.create();
	var forward = vec3.create(),
		right   = vec3.create(),
		up      = vec3.create();
	var hitClient = false;

	// Derive the right and up vectors from the forward vector, because
	// the client won't have any other information.
	vec3.normalize(origin2, forward);
	QMath.PerpendicularVector(forward, right);
	vec3.cross(forward, right, up);

	// Generate the "random" spread pattern.
	for (var i = 0; i < DEFAULT_SHOTGUN_COUNT; i++) {
		r = QMath.crandom() * DEFAULT_SHOTGUN_SPREAD * 16;
		u = QMath.crandom() * DEFAULT_SHOTGUN_SPREAD * 16;
		vec3.add(origin, vec3.scale(forward, 8192 * 16, vec3.create()), end);
		vec3.add(end, vec3.scale(right, r, vec3.create()));
		vec3.add(end, vec3.scale(up, u, vec3.create()));

		if (ShotgunPellet(origin, end, ent) && !hitClient) {
			hitClient = true;
			ent.client.accuracy_hits += 1;
		}
	}
}

/**
 * ShotgunPellet
 */
function ShotgunPellet(start, end, ent) {
	var forward = vec3.subtract(end, start, vec3.create());
	vec3.normalize(forward);

	for (var i = 0; i < 10; i++) {
		var tr = Trace(start, end, null, null, ent.s.number, MASK.SHOT);
		var traceEnt = level.gentities[tr.entityNum];

		// Send bullet impact.
		if (tr.surfaceFlags & SURF.NOIMPACT) {
			return false;
		}

		if (traceEnt.takeDamage) {
			var damage = DEFAULT_SHOTGUN_DAMAGE * QuadFactor(ent);
			Damage(traceEnt, ent, ent, forward, tr.endPos, damage, 0, MOD.SHOTGUN);

			if (LogAccuracyHit(traceEnt, ent)) {
				return true;
			}
		}

		return false;
	}
	return false;
}

/**********************************************************
 *
 * Grenade Launcher
 *
 **********************************************************/

/**
 * GrenadeLauncherFire
 */
function GrenadeLauncherFire(ent) {
	// Set aiming directions.
	var muzzle = vec3.create();
	var forward = vec3.create();

	QMath.AnglesToVectors(ent.client.ps.viewangles, forward, null, null);
	CalcMuzzlePoint(ent, forward, muzzle);

	// Extra vertical velocity.
	forward[2] += 0.2;
	vec3.normalize(forward);

	var m = FireGrenade(ent, muzzle, forward);
	m.damage *= QuadFactor(ent);
	m.splashDamage *= QuadFactor(ent);
}

/**********************************************************
 *
 * Rocket
 *
 **********************************************************/

/**
 * RocketLauncherFire
 */
function RocketLauncherFire(ent) {
	// Set aiming directions.
	var muzzle = vec3.create();
	var forward = vec3.create();

	QMath.AnglesToVectors(ent.client.ps.viewangles, forward, null, null);
	CalcMuzzlePoint(ent, forward, muzzle);

	var m = FireRocket(ent, muzzle, forward);
	m.damage *= QuadFactor(ent);
	m.splashDamage *= QuadFactor(ent);
}

/**********************************************************
 *
 * Lightning Gun
 *
 **********************************************************/

function LightningFire(ent) {
	var damage = 8 * QuadFactor(ent);
	var end = vec3.create();

	// Set aiming directions.
	var muzzle = vec3.create();
	var forward = vec3.create();

	QMath.AnglesToVectors(ent.client.ps.viewangles, forward, null, null);
	CalcMuzzlePoint(ent, forward, muzzle);

	for (var i = 0; i < 10; i++) {
		vec3.add(muzzle, vec3.scale(forward, LIGHTNING_RANGE, vec3.create()), end);

		var tr = Trace(muzzle, end, null, null, ent.s.number, MASK.SHOT);
		if (tr.entityNum === ENTITYNUM_NONE) {
			return;
		}

		var traceEnt = level.gentities[tr.entityNum];
		if (traceEnt.takeDamage) {
			Damage(traceEnt, ent, ent, forward, tr.endPos, damage, 0, MOD.LIGHTNING);
		}

		var tent;
		if (traceEnt.takeDamage && traceEnt.client) {
			tent = TempEntity(tr.endPos, EV.MISSILE_HIT);
			tent.s.otherEntityNum = traceEnt.s.number;
			tent.s.eventParm = QMath.DirToByte(tr.plane.normal);
			tent.s.weapon = ent.s.weapon;
			if (LogAccuracyHit(traceEnt, ent)) {
				ent.client.accuracy_hits++;
			}
		} else if (!(tr.surfaceFlags & SURF.NOIMPACT)) {
			tent = TempEntity(tr.endPos, EV.MISSILE_MISS);
			tent.s.eventParm = QMath.DirToByte(tr.plane.normal);
			tent.s.weapon = ent.s.weapon;
		}

		break;
	}
}

/**********************************************************
 *
 * Plasma Gun
 *
 **********************************************************/

/**
 * PlasmagunFire
 */
function PlasmagunFire(ent) {
	// Set aiming directions.
	var muzzle = vec3.create();
	var forward = vec3.create();

	QMath.AnglesToVectors(ent.client.ps.viewangles, forward, null, null);
	CalcMuzzlePoint(ent, forward, muzzle);

	var m = FirePlasma(ent, muzzle, forward);
	m.damage *= QuadFactor(ent);
	m.splashDamage *= QuadFactor(ent);
}

/**********************************************************
 *
 * Railgun
 *
 **********************************************************/

/**
 * RailgunFire
 */
var MAX_RAIL_HITS = 4;
function RailgunFire(ent) {
	var damage = 100 * QuadFactor(ent);
	var passent = ent.s.number;
	var unlinkedEntities = [];
	var end = vec3.create();
	var hits = 0;
	var trace;

	// Set aiming directions.
	var muzzle = vec3.create();
	var forward = vec3.create();
	var right = vec3.create();
	var up = vec3.create();

	QMath.AnglesToVectors(ent.client.ps.viewangles, forward, right, up);
	CalcMuzzlePoint(ent, forward, muzzle);

	vec3.add(muzzle, vec3.scale(forward, 8192, vec3.create()), end);

	while (unlinkedEntities.length < MAX_RAIL_HITS) {
		// Trace only against the solids, so the railgun will go through people.
		trace = Trace(muzzle, end, null, null, passent, MASK.SHOT);
		if (trace.entityNum >= ENTITYNUM_MAX_NORMAL) {
			break;
		}

		var traceEnt = level.gentities[trace.entityNum];
		if (traceEnt.takeDamage) {
			if (LogAccuracyHit(traceEnt, ent)) {
				hits++;
			}
			Damage(traceEnt, ent, ent, forward, trace.endPos, damage, 0, MOD.RAILGUN);
		}

		if (trace.contents & CONTENTS.SOLID) {
			break;  // we hit something solid enough to stop the beam
		}

		// Unlink this entity, so the next trace will go past it.
		sv.UnlinkEntity(traceEnt);
		unlinkedEntities.push(traceEnt);
	}

	// Link back in any entities we unlinked.
	for (var i = 0; i < unlinkedEntities.length; i++) {
		sv.LinkEntity(unlinkedEntities[i]);
	}

	// The final trace endpos will be the terminal point of the rail trail.

	// Snap the endpos to integers to save net bandwidth, but nudged towards the line.
	// SnapVectorTowards( trace.endpos, muzzle );

	// Send railgun beam effect.
	var tent = TempEntity(trace.endPos, EV.RAILTRAIL);

	// Set player number for custom colors on the railtrail.
	tent.s.clientNum = ent.s.clientNum;
	vec3.set(muzzle, tent.s.origin2);

	// Move origin a bit to come closer to the drawn gun muzzle.
	vec3.add(tent.s.origin2, vec3.scale(right, 4, vec3.create()));
	vec3.add(tent.s.origin2, vec3.scale(up, -1, vec3.create()));

	// No explosion at end if SURF.NOIMPACT, but still make the trail
	if (trace.surfaceFlags & SURF.NOIMPACT) {
		tent.s.eventParm = 255; // Don't make the explosion at the end.
	} else {
		tent.s.eventParm = QMath.DirToByte(trace.plane.normal);
	}
	tent.s.clientNum = ent.s.clientNum;

	// Give the shooter a reward sound if they have made two railgun hits in a row.
	if (hits === 0) {
		// Complete miss.
		ent.client.accurateCount = 0;
	} else {
		// Check for "impressive" reward sound.
		ent.client.accurateCount += hits;
		if (ent.client.accurateCount >= 2) {
			ent.client.accurateCount -= 2;
			ent.client.ps.persistant[PERS.IMPRESSIVE_COUNT]++;
			// Add the sprite over the player's head.
			ent.client.ps.eFlags &= ~(EF.AWARD_IMPRESSIVE | EF.AWARD_EXCELLENT | EF.AWARD_GAUNTLET | EF.AWARD_ASSIST | EF.AWARD_DEFEND | EF.AWARD_CAP );
			ent.client.ps.eFlags |= EF.AWARD_IMPRESSIVE;
			ent.client.rewardTime = level.time + REWARD_SPRITE_TIME;
		}
		ent.client.accuracy_hits++;
	}
}

/**********************************************************
 *
 * BFG
 *
 **********************************************************/

/**
 * BFGFire
 */
function BFGFire(ent) {
	// Set aiming directions.
	var muzzle = vec3.create();
	var forward = vec3.create();

	QMath.AnglesToVectors(ent.client.ps.viewangles, forward, null, null);
	CalcMuzzlePoint(ent, forward, muzzle);

	var m = FireBFG(ent, muzzle, forward);
	m.damage *= QuadFactor(ent);
	m.splashDamage *= QuadFactor(ent);
}
