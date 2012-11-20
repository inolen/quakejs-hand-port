/**
 * Damage
 *
 * Apply damage to an entity.
 * inflictor, attacker, dir, and point can be NULL for environmental damage.
 *
 * @param {GameEntity} targ      Entity that is being damaged
 * @param {GameEntity} inflictor Entity that is causing the damage
 * @param {GameEntity} attacker  Entity that caused the inflictor to damage targ
 * @param {vec3}       dir       Direction of the attack for knockback
 * @param {vec3}       point     Point at which the damage is being inflicted, used for headshots
 * @param {int}        damage    Amount of damage being inflicted
 * @param {int}        dflags    Flags used to control how Damage works
 *                               DAMAGE.RADIUS:        damage was indirect (from a nearby explosion)
 *                               DAMAGE.NO_ARMOR:      armor does not protect from this damage
 *                               DAMAGE.NO_KNOCKBACK:  do not affect velocity, just view angles
 *                               DAMAGE.NO_PROTECTION: kills godmode, armor, everything
 * @param {MOD}         mod      Method of death.
 */
function Damage(targ, inflictor, attacker, dir, point, damage, dflags, mod) {
	if (!targ.takeDamage) {
		return;
	}

	// // The intermission has already been qualified for, so don't
	// // allow any extra scoring.
	// if (level.intermissionQueued) {
	// 	return;
	// }

	if (!inflictor) {
		inflictor = level.gentities[ENTITYNUM_WORLD];
	}

	if (!attacker) {
		attacker = level.gentities[ENTITYNUM_WORLD];
	}

	// // Shootable doors / buttons don't actually have any health.
	// if (targ.s.eType == ET.MOVER) {
	// 	if (targ.use && targ.moverState == MOVER_POS1) {
	// 		targ.use( targ, inflictor, attacker );
	// 	}
	// 	return;
	// }

	// // Reduce damage by the attacker's handicap value
	// // unless they are rocket jumping.
	// if (attacker.client && attacker !== targ) {
	// 	max = attacker.client.ps.stats[STAT_MAX_HEALTH];
	// 	damage = damage * max / 100;
	// }

	var client = targ.client;
	if (client && client.noclip) {
		return;
	}

	if (!dir) {
		dflags |= DAMAGE.NO_KNOCKBACK;
	} else {
		vec3.normalize(dir);
	}

	var knockback = damage;
	if (knockback > 200) {
		knockback = 200;
	}
	if (targ.flags & GFL.NO_KNOCKBACK) {
		knockback = 0;
	}
	if (dflags & DAMAGE.NO_KNOCKBACK) {
		knockback = 0;
	}

	// Figure momentum add, even if the damage won't be taken.
	if (knockback && targ.client) {
		var mass = 200;
		var kvel = vec3.scale(dir, g_knockback() * knockback / mass, [0, 0, 0]);
		vec3.add(targ.client.ps.velocity, kvel);

		// Set the timer so that the other client can't cancel
		// out the movement immediately.
		if (!targ.client.ps.pm_time) {
			var t = knockback * 2;
			if (t < 50) {
				t = 50;
			} else if (t > 200) {
				t = 200;
			}

			targ.client.ps.pm_time = t;
			targ.client.ps.pm_flags |= PMF.TIME_KNOCKBACK;
		}
	}

	// // Check for completely getting out of the damage.
	// if (!(dflags & DAMAGE.NO_PROTECTION)) {
	// 	// If TF_NO_FRIENDLY_FIRE is set, don't do damage to the target.
	// 	// If the attacker was on the same team.
	// 	if (targ !== attacker && OnSameTeam(targ, attacker)) {
	// 		if (!g_friendlyFire()) {
	// 			return;
	// 		}
	// 	}

	// 	// Check for godmode.
	// 	if (targ.flags & GFL.GODMODE) {
	// 		return;
	// 	}
	// }

	// // Battlesuit protects from all radius damage (but takes knockback)
	// // and protects 50% against all damage.
	// if (client && client.ps.powerups[PW_BATTLESUIT]) {
	// 	AddEvent(targ, EV.POWERUP_BATTLESUIT, 0);
	// 	if ((dflags & DAMAGE.RADIUS) || (mod === MOD.FALLING)) {
	// 		return;
	// 	}
	// 	damage *= 0.5;
	// }

	// // Add to the attacker's hit counter (if the target isn't a general entity like a prox mine).
	// if (attacker.client && client &&
	// 	targ !== attacker && targ.health > 0 &&
	// 	targ.s.eType != ET.MISSILE &&
	// 	targ.s.eType != ET.GENERAL) {
	// 	if (OnSameTeam( targ, attacker)) {
	// 		attacker.client.ps.persistant[PERS.HITS]--;
	// 	} else {
	// 		attacker.client.ps.persistant[PERS.HITS]++;
	// 	}
	// 	attacker.client.ps.persistant[PERS.ATTACKEE_ARMOR] = (targ.health<<8)|(client.ps.stats[STAT.ARMOR]);
	// }

	// Always give half damage if hurting self.
	// Calculated after knockback, so rocket jumping works.
	if (targ === attacker) {
		damage *= 0.5;
	}
	if (damage < 1) {
		damage = 1;
	}

	var take = damage;
	// Save some from armor.
	// asave = CheckArmor(targ, take, dflags);
	// take -= asave;

	if (g_debugDamage.integer) {
		log(level.time, ', client', targ.s.number, ', health', targ.health, ', damage', take, ', armor', asave);
	}

	// Add to the damage inflicted on a player this frame.
	// The total will be turned into screen blends and view angle kicks
	// at the end of the frame.
	// if (client) {
	// 	if (attacker) {
	// 		client.ps.persistant[PERS.ATTACKER] = attacker.s.number;
	// 	} else {
	// 		client.ps.persistant[PERS.ATTACKER] = ENTITYNUM_WORLD;
	// 	}
	// 	client.damage_armor += asave;
	// 	client.damage_blood += take;
	// 	client.damage_knockback += knockback;
	// 	if (dir) {
	// 		vec3.set(dir, client.damage_from)
	// 		client.damage_fromWorld = false;
	// 	} else {
	// 		vec3.set(targ.currentOrigin, client.damage_from);
	// 		client.damage_fromWorld = true;
	// 	}
	// }

	// See if it's the player hurting the emeny flag carrier.
	// if (g_gametype.integer === GT_CTF) {
	// 	Team_CheckHurtCarrier(targ, attacker);
	// }

	// if (targ.client) {
	// 	// set the last client who damaged the target
	// 	targ.client.lasthurt_client = attacker.s.number;
	// 	targ.client.lasthurt_mod = mod;
	// }

	// Do the damage.
	if (take) {
		targ.health = targ.health - take;

		// TODO Is this necessary? We do this in EndClientFrame
		if (targ.client) {
			targ.client.ps.stats[STAT.HEALTH] = targ.health;
		}
			
		// if (targ.health <= 0) {
		// 	if (client) {
		// 		targ.flags |= GFL.NO_KNOCKBACK;
		// 	}

		// 	if (targ.health < -999) {
		// 		targ.health = -999;
		// 	}

		// 	targ.enemy = attacker;
		// 	targ.die(targ, inflictor, attacker, take, mod);
		// 	return;
		// } else if (targ.pain) {
		// 	targ.pain (targ, attacker, take);
		// }
	}

}

/**
 * RadiusDamage
 */
function RadiusDamage(origin, attacker, damage, radius, ignore, mod) {
	var v = [0, 0, 0];
	var mins = [0, 0, 0];
	var maxs = [0, 0, 0];
	var hitClient = false;

	if (radius < 1) {
		radius = 1;
	}

	for (var i = 0; i < 3; i++) {
		mins[i] = origin[i] - radius;
		maxs[i] = origin[i] + radius;
	}

	var entityNums = sv.FindEntitiesInBox(mins, maxs);

	for (var e = 0; e < entityNums.length; e++) {
		var ent = level.gentities[entityNums[e]];

		if (ent === ignore) {
			continue;
		}

		if (!ent.takeDamage) {
			continue;
		}

		// Find the distance from the edge of the bounding box.
		for (var i = 0; i < 3; i++) {
			if (origin[i] < ent.absmin[i]) {
				v[i] = ent.absmin[i] - origin[i];
			} else if (origin[i] > ent.absmax[i]) {
				v[i] = origin[i] - ent.absmax[i];
			} else {
				v[i] = 0;
			}
		}

		var dist = vec3.length(v);
		if (dist >= radius) {
			continue;
		}

		points = damage * (1.0 - dist / radius);

		if (CanDamage (ent, origin)) {
			if (LogAccuracyHit(ent, attacker)) {
				hitClient = true;
			}

			var dir = vec3.subtract(ent.currentOrigin, origin, [0, 0, 0]);
			// Push the center of mass higher than the origin so players
			// get knocked into the air more.
			dir[2] += 24;
			
			Damage(ent, null, attacker, dir, origin, points, DAMAGE.RADIUS, mod);
		}
	}

	return hitClient;
}


/**
 * CanDamage
 *
 * Returns true if the inflictor can directly damage the target. Used for
 * explosions and melee attacks.
 */
function CanDamage(targ, origin) {
	// Use the midpoint of the bounds instead of the origin, because
	// bmodels may have their origin is 0,0,0
	var midpoint = vec3.add(targ.absmin, targ.absmax, [0, 0, 0]);
	vec3.scale(midpoint, 0.5);

	var dest = vec3.set(midpoint, [0, 0, 0]);
	var tr = sv.Trace(origin, dest, qm.vec3_origin, qm.vec3_origin, ENTITYNUM_NONE, MASK.SOLID);
	if (tr.fraction === 1.0 || tr.entityNum === targ.s.number) {
		return true;
	}

	// This should probably check in the plane of projection, 
	// rather than in world coordinate, and also include Z.
	vec3.set(midpoint, dest);
	dest[0] += 15.0;
	dest[1] += 15.0;
	tr = sv.Trace(origin, dest, qm.vec3_origin, qm.vec3_origin, ENTITYNUM_NONE, MASK.SOLID);
	if (tr.fraction === 1.0) {
		return true;
	}

	vec3.set(midpoint, dest);
	dest[0] += 15.0;
	dest[1] -= 15.0;
	tr = sv.Trace(origin, dest, qm.vec3_origin, qm.vec3_origin, ENTITYNUM_NONE, MASK.SOLID);
	if (tr.fraction === 1.0) {
		return true;
	}

	vec3.set(midpoint, dest);
	dest[0] -= 15.0;
	dest[1] += 15.0;
	tr = sv.Trace(origin, dest, qm.vec3_origin, qm.vec3_origin, ENTITYNUM_NONE, MASK.SOLID);
	if (tr.fraction === 1.0) {
		return true;
	}

	vec3.set(midpoint, dest);
	dest[0] -= 15.0;
	dest[1] -= 15.0;
	tr = sv.Trace(origin, dest, qm.vec3_origin, qm.vec3_origin, ENTITYNUM_NONE, MASK.SOLID);
	if (tr.fraction === 1.0) {
		return true;
	}

	return false;
}


/**
 * LogAccuracyHit
 */
function LogAccuracyHit(target, attacker) {
	if (!target.takeDamage) {
		return false;
	}

	if (target === attacker) {
		return false;
	}

	if (!target.client) {
		return false;
	}

	if (!attacker.client) {
		return false;
	}

	if (target.client.ps.stats[STAT.HEALTH] <= 0) {
		return false;
	}

	// if (OnSameTeam(target, attacker)) {
	// 	return false;
	// }

	return true;
}

