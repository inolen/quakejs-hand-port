var MACHINEGUN_SPREAD      = 200;
var MACHINEGUN_DAMAGE      = 7;
var MACHINEGUN_TEAM_DAMAGE = 5; // wimpier MG in teamplay

var forward = [0, 0, 0];
var right   = [0, 0, 0];
var up      = [0, 0, 0];
var muzzle  = [0, 0, 0];

/**
 * FireWeapon
 */
function FireWeapon(ent) {
	var client = ent.client;

	// if (client.ps.powerups[PW_QUAD] ) {
	// 	s_quadFactor = g_quadfactor.value;
	// } else {
	// 	s_quadFactor = 1;
	// }

	// // Track shots taken for accuracy tracking. Grapple is not a weapon and gauntet is just not tracked.
	// if (ent.s.weapon !== WP.GRAPPLING_HOOK && ent.s.weapon !== WP.GAUNTLET) {
	// 	client.accuracy_shots++;
	// }

	// Set aiming directions.
	QMath.AnglesToVectors(client.ps.viewangles, forward, right, up);
	CalcMuzzlePointOrigin(ent, client.oldOrigin, forward, right, up, muzzle);

	// Fire the specific weapon.
	switch (ent.s.weapon) {
		// case WP.GAUNTLET:
		// 	Weapon_Gauntlet( ent );
		// 	break;
		// case WP.LIGHTNING:
		// 	Weapon_LightningFire( ent );
		// 	break;
		case WP.SHOTGUN:
			weapon_supershotgun_fire(ent);
			break;
		case WP.MACHINEGUN:
			// if (g_gametype.integer !== GT.TEAM) {
				BulletFire(ent, MACHINEGUN_SPREAD, MACHINEGUN_DAMAGE, MOD.MACHINEGUN);
			// } else {
			// 	Bullet_Fire( ent, MACHINEGUN_SPREAD, MACHINEGUN_TEAM_DAMAGE, MOD_MACHINEGUN );
			// }
			break;
		// case WP.GRENADE_LAUNCHER:
		// 	weapon_grenadelauncher_fire( ent );
		// 	break;
		case WP.ROCKET_LAUNCHER:
			RocketLauncherFire(ent);
			break;
		// case WP.PLASMAGUN:
		// 	Weapon_Plasmagun_Fire( ent );
		// 	break;
		case WP.RAILGUN:
			RailgunFire(ent);
		 	break;
		// case WP.BFG:
		// 	BFG_Fire( ent );
		// 	break;
		// case WP.GRAPPLING_HOOK:
		// 	Weapon_GrapplingHook_Fire( ent );
		// 	break;
		default:
			break;
	}
}

/*
======================================================================

SHOTGUN

======================================================================
*/

// DEFAULT_SHOTGUN_SPREAD and DEFAULT_SHOTGUN_COUNT	are in bg_public.h, because
// client predicts same spreads
var DEFAULT_SHOTGUN_DAMAGE = 10;

function ShotgunPellet(start, end, ent ) {
	var tr;
	var damage, i, passent;
	var traceEnt;
	var tr_start, tr_end;
	
// 	passent = ent.s.number;
// 	VectorCopy( start, tr_start );
// 	VectorCopy( end, tr_end );
// 	for (i = 0; i < 10; i++) {
// 		trap_Trace (&tr, tr_start, null, null, tr_end, passent, MASK_SHOT);
// 		traceEnt = &g_entities[ tr.entityNum ];
// 		
// 		// send bullet impact
// 		if (  tr.surfaceFlags & SURF_NOIMPACT ) {
// 			return false;
// 		}
// 		
// 		if ( traceEnt.takeDamage) {
// 			damage = DEFAULT_SHOTGUN_DAMAGE * s_quadFactor;
// 			G_Damage( traceEnt, ent, ent, forward, tr.endpos, damage, 0, MOD.SHOTGUN);
// 				if( LogAccuracyHit( traceEnt, ent ) ) {
// 					return true;
// 				}
// 		}
// 		return false;
// 	}
	return false;
}

// this should match CG_ShotgunPattern
function ShotgunPattern(origin, origin2, seed, ent) {
	var i;
	var r, u;
	var end;
	var forward, right, up;
	var hitClient = false;
	
	// derive the right and up vectors from the forward vector, because
	// the client won't have any other information
// 	VectorNormalize2( origin2, forward );
// 	PerpendicularVector( right, forward );
// 	CrossProduct( forward, right, up );
// 	
// 	// generate the "random" spread pattern
// 	for ( i = 0 ; i < DEFAULT_SHOTGUN_COUNT ; i++ ) {
// 		r = Math.random() * DEFAULT_SHOTGUN_SPREAD * 16;
// 		u = Math.random() * DEFAULT_SHOTGUN_SPREAD * 16;
// 		VectorMA(origin, 8192 * 16, forward, end);
// 		VectorMA(end, r, right, end);
// 		VectorMA(end, u, up, end);
// 		if( ShotgunPellet( origin, end, ent ) && !hitClient ) {
// 			hitClient = true;
// 			ent.client.accuracy_hits++;
// 		}
// 	}
}


function weapon_supershotgun_fire (ent) {
	var tent;
	
	// send shotgun blast
	tent = TempEntity( muzzle, EV.SHOTGUN );
	vec3.scale( forward, 4096, tent.s.origin2 );
// 	sv.SnapVector( tent.s.origin2 );
	tent.s.eventParm = Math.floor(Math.random() * 65536) & 255;		// seed for spread pattern
	tent.s.otherEntityNum = ent.s.number;
	
// 	ShotgunPattern( tent.s.pos.trBase, tent.s.origin2, tent.s.eventParm, ent );
}

/**
 * CalcMuzzlePointOrigin
 * 
 * Set muzzle location relative to pivoting eye.
 */
function CalcMuzzlePointOrigin (ent, origin, forward, right, up, muzzlePoint) {
	vec3.set(ent.s.pos.trBase, muzzlePoint);
	muzzlePoint[2] += ent.client.ps.viewheight;
	vec3.add(muzzlePoint, vec3.scale(forward, 14, [0, 0, 0]));
	// Snap to integer coordinates for more efficient network bandwidth usage.
	// SnapVector(muzzlePoint);
}

/**
 * BulletFire
 */
function BulletFire(ent, spread, damage, mod) {
	// damage *= s_quadFactor;

	var r = Math.random() * Math.PI * 2;
	var u = Math.sin(r) * QMath.crandom() * spread * 16;
	r = Math.cos(r) * QMath.crandom() * spread * 16;

	var end = vec3.add(muzzle, vec3.scale(forward, 8192*16, [0, 0, 0]), [0, 0, 0]);
	vec3.add(end, vec3.scale(right, r, [0, 0, 0]));
	vec3.add(end, vec3.scale(up, u, [0, 0, 0]));

	var passent = ent.s.number;
	
	for (var i = 0; i < 10; i++) {
		var tr = sv.Trace(muzzle, end, null, null, passent, MASK.SHOT);

		if (tr.surfaceFlags & SURF.NOIMPACT) {
			return;
		}

		var traceEnt = level.gentities[tr.entityNum];

		// Snap the endpos to integers, but nudged towards the line.
		// SnapVectorTowards(tr.endPos, muzzle);

		// Send bullet impact.
		if (traceEnt.takeDamage && traceEnt.client) {
			tent = TempEntity(tr.endPos, EV.BULLET_HIT_FLESH);
			tent.s.eventParm = traceEnt.s.number;
			if (LogAccuracyHit(traceEnt, ent)) {
				ent.client.accuracy_hits++;
			}
		} else {
			var tent = TempEntity(tr.endPos, EV.BULLET_HIT_WALL);
			tent.s.eventParm = QMath.DirToByte(tr.plane.normal);
		}
		tent.s.otherEntityNum = ent.s.number;

		if (traceEnt.takeDamage) {
			Damage(traceEnt, ent, ent, forward, tr.endPos, damage, 0, mod);
		}

		break;
	}
}

/**
 * RocketLauncherFire*
 */
function RocketLauncherFire(ent) {
	var m = FireRocket(ent, muzzle, forward);
	// m.damage *= s_quadFactor;
	// m.splashDamage *= s_quadFactor;
}


/**
 * RailgunFire
 */
var MAX_RAIL_HITS = 4;
function RailgunFire(ent) {
	var damage = 100;// * s_quadFactor;
	var passent = ent.s.number;
	var unlinkedEntities = [];
	var end = [0, 0, 0];
	var hits = 0;

	vec3.add(muzzle, vec3.scale(forward, 8192, [0, 0, 0]), end);

	while (unlinkedEntities.length < MAX_RAIL_HITS) {
		// Trace only against the solids, so the railgun will go through people.
		var trace = sv.Trace(muzzle, end, null, null, passent, MASK.SHOT);
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
	vec3.add(tent.s.origin2, vec3.scale(right, 4, [0, 0, 0]));
	vec3.add(tent.s.origin2, vec3.scale(up, -1, [0, 0, 0]));

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
