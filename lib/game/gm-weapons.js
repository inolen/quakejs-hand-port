var MACHINEGUN_SPREAD      = 200;
var MACHINEGUN_DAMAGE      = 7;
var MACHINEGUN_TEAM_DAMAGE = 5; // wimpier MG in teamplay

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
	// if (ent.s.weapon !== Weapon.GRAPPLING_HOOK && ent.s.weapon !== Weapon.GAUNTLET) {
	// 	client.accuracy_shots++;
	// }

	// Set aiming directions.
	// TODO Stop passing these around as mutable args everywhere
	var forward = [0, 0, 0];
	var right = [0, 0, 0];
	var up = [0, 0, 0];
	var muzzle = [0, 0, 0];
	qm.AnglesToVectors(client.ps.viewangles, forward, right, up);
	CalcMuzzlePointOrigin(ent, client.oldOrigin, forward, right, up, muzzle);

	// Fire the specific weapon.
	switch (ent.s.weapon) {
		// case WP_GAUNTLET:
		// 	Weapon_Gauntlet( ent );
		// 	break;
		// case WP_LIGHTNING:
		// 	Weapon_LightningFire( ent );
		// 	break;
		// case WP_SHOTGUN:
		// 	weapon_supershotgun_fire( ent );
		// 	break;
		case Weapon.MACHINEGUN:
			// if (g_gametype.integer !== GT_TEAM) {
				BulletFire(ent, muzzle, forward, right, up, MACHINEGUN_SPREAD, MACHINEGUN_DAMAGE, MeansOfDeath.MACHINEGUN);
			// } else {
			// 	Bullet_Fire( ent, MACHINEGUN_SPREAD, MACHINEGUN_TEAM_DAMAGE, MOD_MACHINEGUN );
			// }
			break;
		// case WP_GRENADE_LAUNCHER:
		// 	weapon_grenadelauncher_fire( ent );
		// 	break;
		// case WP_ROCKET_LAUNCHER:
		// 	Weapon_RocketLauncher_Fire( ent );
		// 	break;
		// case WP_PLASMAGUN:
		// 	Weapon_Plasmagun_Fire( ent );
		// 	break;
		// case WP_RAILGUN:
		// 	weapon_railgun_fire( ent );
		// 	break;
		// case WP_BFG:
		// 	BFG_Fire( ent );
		// 	break;
		// case WP_GRAPPLING_HOOK:
		// 	Weapon_GrapplingHook_Fire( ent );
		// 	break;
		default:
			break;
	}
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
function BulletFire(ent, muzzle, forward, right, up, spread, damage, mod) {
	// damage *= s_quadFactor;

	var r = Math.random() * Math.PI * 2;
	var u = Math.sin(r) * qm.crandom() * spread * 16;
	r = Math.cos(r) * qm.crandom() * spread * 16;

	var end = vec3.add(muzzle, vec3.scale(forward, 8192*16, [0, 0, 0]), [0, 0, 0]);
	vec3.add(end, vec3.scale(right, r, [0, 0, 0]));
	vec3.add(end, vec3.scale(up, u, [0, 0, 0]));

	var passent = ent.s.number;
	
	// for (var i = 0; i < 10; i++) {
		var tr = sv.Trace(muzzle, end, null, null, passent, ContentMasks.SHOT);

		if (tr.surfaceFlags & sh.SurfaceFlags.NOIMPACT) {
			return;
		}

		var traceEnt = level.gentities[tr.entityNum];

		// Snap the endpos to integers, but nudged towards the line.
		// SnapVectorTowards(tr.endpos, muzzle);

		// Send bullet impact.
		// if (traceEnt->takedamage && traceEnt->client) {
		// 	tent = G_TempEntity(tr.endpos, EV_BULLET_HIT_FLESH);
		// 	tent.s.eventParm = traceEnt.s.number;
		// 	// if (LogAccuracyHit(traceEnt, ent)) {
		// 	// 	client.accuracy_hits++;
		// 	// }
		// } else {
			var tent = TempEntity(tr.endPos, EntityEvent.BULLET_HIT_WALL);
			//tent.s.eventParm = DirToByte(tr.plane.normal);
		// }
		// tent.s.otherEntityNum = ent.s.number;

		// if (traceEnt.takedamage) {
		// 	G_Damage( traceEnt, ent, ent, forward, tr.endpos, damage, 0, mod);
		// }

		// break;
	// }
}