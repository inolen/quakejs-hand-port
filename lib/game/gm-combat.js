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

	// The intermission has already been qualified for, so don't
	// allow any extra scoring.
	if (level.intermissionQueued) {
		return;
	}

	if (!inflictor) {
		inflictor = level.gentities[ENTITYNUM_WORLD];
	}

	if (!attacker) {
		attacker = level.gentities[ENTITYNUM_WORLD];
	}

	// Shootable doors / buttons don't actually have any health.
	if (targ.s.eType === ET.MOVER) {
		if (targ.use && targ.moverState == MOVER.POS1) {
			targ.use(targ, inflictor, attacker);
		}
		return;
	}

	// // Reduce damage by the attacker's handicap value
	// // unless they are rocket jumping.
	// if (attacker.client && attacker !== targ) {
	// 	max = attacker.client.ps.stats[STAT.MAX_HEALTH];
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
		var kvel = vec3.scale(dir, g_knockback.get() * knockback / mass, vec3.create());
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

	// Check for completely getting out of the damage.
	if (!(dflags & DAMAGE.NO_PROTECTION)) {
		// If TF_NO_FRIENDLY_FIRE is set, don't do damage to the target.
		// If the attacker was on the same team.
		if (targ !== attacker && OnSameTeam(targ, attacker)) {
			if (!g_friendlyFire.get()) {
				return;
			}
		}

		// Check for godmode.
		if (targ.flags & GFL.GODMODE) {
			return;
		}

		// No damage in during CA warmup or practice arena.
		if ((level.arena.gametype >= GT.CLANARENA && level.arena.state.current <= GS.COUNTDOWN) ||
		    level.arena.gametype === GT.PRACTICEARENA) {
			return;
		}

		// Free splash damage / no falling damage in CA.
		if (level.arena.gametype >= GT.CLANARENA) {
			if (targ === attacker && (dflags & DAMAGE.RADIUS)) {
				return;
			} else if (mod === MOD.FALLING) {
				return;
			}
		}
	}

	// Battlesuit protects from all radius damage (but takes knockback)
	// and protects 50% against all damage.
	if (client && client.ps.powerups[PW.BATTLESUIT]) {
		AddEvent(targ, EV.POWERUP_BATTLESUIT, 0);
		if ((dflags & DAMAGE.RADIUS) || (mod === MOD.FALLING)) {
			return;
		}
		damage *= 0.5;
	}

	// Add to the attacker's hit counter (if the target isn't a general entity like a prox mine).
	if (attacker.client && client &&
		targ !== attacker && targ.health > 0 &&
		targ.s.eType !== ET.MISSILE &&
		targ.s.eType !== ET.GENERAL) {
		if (OnSameTeam(targ, attacker)) {
			attacker.client.ps.persistant[PERS.HITS]--;
		} else {
			attacker.client.ps.persistant[PERS.HITS]++;
		}
	}

	// Always give half damage if hurting self.
	// Calculated after knockback, so rocket jumping works.
	if (targ === attacker) {
		damage *= 0.5;
	}

	// Round damage up (always do at least 1 damage).
	damage = Math.ceil(damage);

	// Calculate damage taken after armor is accounted for.
	var take = damage;
	var asave = CheckArmor(targ, take, dflags);
	take -= asave;

	// if (g_debugDamage.integer) {
	// 	log(level.time, ', client', targ.s.number, ', health', targ.health, ', damage', take, ', armor', asave);
	// }

	// Add to the damage inflicted on a player this frame.
	// The total will be turned into screen blends and view angle kicks
	// at the end of the frame.
	if (client) {
		if (attacker) {
			client.ps.persistant[PERS.ATTACKER] = attacker.s.number;
		} else {
			client.ps.persistant[PERS.ATTACKER] = ENTITYNUM_WORLD;
		}
		client.damage_armor += asave;
		client.damage_blood += take;
		client.damage_knockback += knockback;
		if (dir) {
			vec3.set(dir, client.damage_from);
			client.damage_fromWorld = false;
		} else {
			vec3.set(targ.r.currentOrigin, client.damage_from);
			client.damage_fromWorld = true;
		}
	}

	// See if it's the player hurting the emeny flag carrier.
	if (level.arena.gametype === GT.CTF) {
		Team_CheckHurtCarrier(targ, attacker);
	}

	if (targ.client) {
		// Set the last client who damaged the target.
		targ.client.lasthurt_client = attacker.s.number;
		targ.client.lasthurt_mod = mod;
	}

	// Do the damage.
	if (take) {
		targ.health = targ.health - take;

		// FIXME Is this necessary? We do this in EndClientFrame
		if (targ.client) {
			targ.client.ps.stats[STAT.HEALTH] = targ.health;
		}

		if (targ.health <= 0) {
			if (client) {
				targ.flags |= GFL.NO_KNOCKBACK;
			}

			if (targ.health < -999) {
				targ.health = -999;
			}

			targ.enemy = attacker;
			targ.die(targ, inflictor, attacker, take, mod);
			return;
		} else if (targ.pain) {
			targ.pain(targ, attacker, take);
		}
	}

}

/**
 * RadiusDamage
 */
function RadiusDamage(origin, inflictor, attacker, damage, radius, ignore, mod) {
	var v = vec3.create();
	var mins = vec3.create();
	var maxs = vec3.create();
	var hitClient = false;

	if (radius < 1) {
		radius = 1;
	}

	for (var i = 0; i < 3; i++) {
		mins[i] = origin[i] - radius;
		maxs[i] = origin[i] + radius;
	}

	var entityNums = FindEntitiesInBox(mins, maxs);

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
			if (origin[i] < ent.r.absmin[i]) {
				v[i] = ent.r.absmin[i] - origin[i];
			} else if (origin[i] > ent.r.absmax[i]) {
				v[i] = origin[i] - ent.r.absmax[i];
			} else {
				v[i] = 0;
			}
		}

		var dist = vec3.length(v);
		if (dist >= radius) {
			continue;
		}

		var points = damage * (1.0 - dist / radius);

		if (CanDamage(ent, origin)) {
			if (LogAccuracyHit(ent, attacker)) {
				hitClient = true;
			}

			var dir = vec3.subtract(ent.r.currentOrigin, origin, vec3.create());
			// Push the center of mass higher than the origin so players
			// get knocked into the air more.
			dir[2] += 24;

			Damage(ent, inflictor, attacker, dir, origin, points, DAMAGE.RADIUS, mod);
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
	var trace = new QS.TraceResults();

	// Use the midpoint of the bounds instead of the origin, because
	// bmodels may have their origin is 0,0,0
	var midpoint = vec3.add(targ.r.absmin, targ.r.absmax, vec3.create());
	vec3.scale(midpoint, 0.5);

	var dest = vec3.create(midpoint);

	Trace(trace, origin, dest, QMath.vec3origin, QMath.vec3origin, ENTITYNUM_NONE, MASK.SOLID);

	if (trace.fraction === 1.0 || trace.entityNum === targ.s.number) {
		return true;
	}

	// This should probably check in the plane of projection,
	// rather than in world coordinate, and also include Z.
	vec3.set(midpoint, dest);
	dest[0] += 15.0;
	dest[1] += 15.0;
	Trace(trace, origin, dest, QMath.vec3origin, QMath.vec3origin, ENTITYNUM_NONE, MASK.SOLID);
	if (trace.fraction === 1.0) {
		return true;
	}

	vec3.set(midpoint, dest);
	dest[0] += 15.0;
	dest[1] -= 15.0;
	Trace(trace, origin, dest, QMath.vec3origin, QMath.vec3origin, ENTITYNUM_NONE, MASK.SOLID);
	if (trace.fraction === 1.0) {
		return true;
	}

	vec3.set(midpoint, dest);
	dest[0] -= 15.0;
	dest[1] += 15.0;
	Trace(trace, origin, dest, QMath.vec3origin, QMath.vec3origin, ENTITYNUM_NONE, MASK.SOLID);
	if (trace.fraction === 1.0) {
		return true;
	}

	vec3.set(midpoint, dest);
	dest[0] -= 15.0;
	dest[1] -= 15.0;
	Trace(trace, origin, dest, QMath.vec3origin, QMath.vec3origin, ENTITYNUM_NONE, MASK.SOLID);
	if (trace.fraction === 1.0) {
		return true;
	}

	return false;
}

/**
 * PlayerDie
 */
var deathAnim = 0;
function PlayerDie(self, inflictor, attacker, damage, meansOfDeath) {
	if (self.client.ps.pm_type === PM.DEAD) {
		return;
	}

	if (IntermissionStarted()) {
		return;
	}

	// // Check for an almost capture.
	// CheckAlmostCapture(self, attacker);

	// // Check for a player that almost brought in cubes.
	// CheckAlmostScored(self, attacker);

	// if (self.client && self.client.hook) {
	// 	Weapon_HookFree(self.client.hook);
	// }

	self.client.ps.pm_type = PM.DEAD;

	if (level.arena.gametype >= GT.CLANARENA &&
		// If the player was killed due to the environment during
		// warmup, don't eliminate them.
		level.arena.state.current >= GS.ACTIVE) {
		self.client.pers.teamState.state = TEAM_STATE.ELIMINATED;
	}

	var killer;
	var killerName;
	if (attacker) {
		killer = attacker.s.number;
		if (attacker.client) {
			killerName = attacker.client.pers.name;
		} else {
			killerName = '<non-client>';
		}
	}
	if (killer === undefined || killer < 0 || killer >= MAX_CLIENTS) {
		killer = ENTITYNUM_WORLD;
		killerName = '<world>';
	}

	log('Kill:', killer, self.s.number, meansOfDeath, ',', killerName, 'killed', self.client.pers.name);

	// Broadcast the death event to everyone.
	var ent = TempEntity(self.r.currentOrigin, EV.OBITUARY);
	ent.s.eventParm = meansOfDeath;
	ent.s.otherEntityNum = self.s.number;
	ent.s.otherEntityNum2 = killer;
	ent.r.svFlags = SVF.BROADCAST;  // send to everyone

	self.enemy = attacker;

	self.client.ps.persistant[PERS.DEATHS]++;

	if (attacker && attacker.client) {
		attacker.client.lastkilled_client = self.s.number;

		if (attacker === self || OnSameTeam(self, attacker)) {
			AddScore(attacker, self.r.currentOrigin, -1);

			attacker.client.ps.persistant[PERS.FRAGS]--;
		} else {
			AddScore(attacker, self.r.currentOrigin, 1);

			attacker.client.ps.persistant[PERS.FRAGS]++;

			if (meansOfDeath === MOD.GAUNTLET) {
				// Play humiliation on player.
				attacker.client.ps.persistant[PERS.GAUNTLET_FRAG_COUNT]++;

				// Add the sprite over the player's head
				attacker.client.ps.eFlags &= ~(EF.AWARD_IMPRESSIVE | EF.AWARD_EXCELLENT | EF.AWARD_GAUNTLET | EF.AWARD_ASSIST | EF.AWARD_DEFEND | EF.AWARD_CAP );
				attacker.client.ps.eFlags |= EF.AWARD_GAUNTLET;
				attacker.client.rewardTime = level.time + REWARD_SPRITE_TIME;

				// Also play humiliation on target.
				self.client.ps.persistant[PERS.PLAYEREVENTS] ^= PLAYEREVENTS.GAUNTLETREWARD;
			}

			// Check for two kills in a short amount of time
			// if this is close enough to the last kill, give a reward sound.
			if (level.time - attacker.client.lastKillTime < CARNAGE_REWARD_TIME ) {
				// play excellent on player
				attacker.client.ps.persistant[PERS.EXCELLENT_COUNT]++;

				// add the sprite over the player's head
				attacker.client.ps.eFlags &= ~(EF.AWARD_IMPRESSIVE | EF.AWARD_EXCELLENT | EF.AWARD_GAUNTLET | EF.AWARD_ASSIST | EF.AWARD_DEFEND | EF.AWARD_CAP );
				attacker.client.ps.eFlags |= EF.AWARD_EXCELLENT;
				attacker.client.rewardTime = level.time + REWARD_SPRITE_TIME;
			}
			attacker.client.lastKillTime = level.time;
		}
	} else {
		AddScore(self, self.r.currentOrigin, -1);
	}

	// Add team bonuses.
	Team_FragBonuses(self, inflictor, attacker);

	// If I committed suicide, the flag does not fall, it returns.
	if (meansOfDeath === MOD.SUICIDE) {
		if (self.client.ps.powerups[PW.NEUTRALFLAG]) {  // only happens in One Flag CTF
			Team_ReturnFlag(TEAM.FREE);
			self.client.ps.powerups[PW.NEUTRALFLAG] = 0;

		} else if (self.client.ps.powerups[PW.REDFLAG]) {  // only happens in standard CTF
			Team_ReturnFlag(TEAM.RED);
			self.client.ps.powerups[PW.REDFLAG] = 0;

		} else if (self.client.ps.powerups[PW.BLUEFLAG]) {  // only happens in standard CTF
			Team_ReturnFlag(TEAM.BLUE);
			self.client.ps.powerups[PW.BLUEFLAG] = 0;
		}
	}

	TossClientItems(self);

	SendScoreboardMessage(self);  // show scores

	// Send updated scores to any clients that are following this one,
	// or they would get stale scoreboards.
	for (var i = 0; i < level.maxclients; i++) {
		var client = level.clients[i];
		if (client.pers.connected !== CON.CONNECTED) {
			continue;
		}
		if (client.sess.team !== TEAM.SPECTATOR) {
			continue;
		}
		if (client.sess.spectatorClient === self.s.number) {
			SendScoreboardMessage(level.gentities[i]);
		}
	}

	self.takeDamage = true;  // can still be gibbed

	self.s.weapon = WP.NONE;
	self.s.powerups = 0;
	self.r.contents = SURF.CONTENTS.CORPSE;

	self.s.angles[0] = 0;
	self.s.angles[2] = 0;
	LookAtKiller(self, inflictor, attacker);
	vec3.set(self.s.angles, self.client.ps.viewangles);

	self.s.loopSound = 0;
	self.r.maxs[2] = -8;

	// Don't allow respawn until the death anim is done
	// g_forceRespawn may force spawning at some later time.
	self.client.respawnTime = level.time + 1700;

	// Remove powerups.
	for (var i = 0; i < MAX_POWERUPS; i++) {
		self.client.ps.powerups[i] = 0;
	}

	// Never gib in a nodrop.
	var contents = PointContents(self.r.currentOrigin, -1);

	if ((self.health <= GIB_HEALTH && !(contents & SURF.CONTENTS.NODROP)/* && g_blood.integer*/) || meansOfDeath === MOD.SUICIDE) {
		// Gib death.
		GibEntity(self, killer);
	} else {
		// Normal death
		var anim;

		switch (deathAnim) {
			case 0:
				anim = ANIM.BOTH_DEATH1;
				break;
			case 1:
				anim = ANIM.BOTH_DEATH2;
				break;
			case 2:
			default:
				anim = ANIM.BOTH_DEATH3;
				break;
		}

		// For the no-blood option, we need to prevent the health
		// from going to gib level.
		if (self.health <= GIB_HEALTH) {
			self.health = GIB_HEALTH+1;
		}

		self.client.ps.legsAnim = ((self.client.ps.legsAnim & ANIM_TOGGLEBIT) ^ ANIM_TOGGLEBIT) | anim;
		self.client.ps.torsoAnim =  ((self.client.ps.torsoAnim & ANIM_TOGGLEBIT) ^ ANIM_TOGGLEBIT ) | anim;

		AddEvent(self, EV.DEATH1 + deathAnim, killer);

		// The body can still be gibbed.
		self.die = BodyDie;

		// Globally cycle through the different death animations.
		deathAnim = (deathAnim + 1) % 3;
	}

	SV.LinkEntity(self);
}

/**
 * LookAtKiller
 */
function LookAtKiller(self, inflictor, attacker) {
	var dir = vec3.create();

	if (attacker && attacker !== self) {
		vec3.subtract(attacker.s.pos.trBase, self.s.pos.trBase, dir);
	} else if (inflictor && inflictor !== self) {
		vec3.subtract(inflictor.s.pos.trBase, self.s.pos.trBase, dir);
	} else {
		self.client.ps.stats[STAT.DEAD_YAW] = self.s.angles[QMath.YAW];
		return;
	}

	self.client.ps.stats[STAT.DEAD_YAW] = VecToYaw(dir);
}

/**
 * GibEntity
 */
function GibEntity(self, killer) {
	AddEvent(self, EV.GIB_PLAYER, killer);
	self.takeDamage = false;
	self.s.eType = ET.INVISIBLE;
	self.r.contents = 0;
}

/**
 * VecToYaw
 */
function VecToYaw(vec) {
	var yaw;

	if (vec[QMath.YAW] === 0 && vec[QMath.PITCH] === 0) {
		yaw = 0;
	} else {
		if (vec[QMath.PITCH]) {
			yaw = (Math.atan2(vec[QMath.YAW], vec[QMath.PITCH]) * 180 / Math.PI);
		} else if (vec[QMath.YAW] > 0) {
			yaw = 90;
		} else {
			yaw = 270;
		}
		if (yaw < 0) {
			yaw += 360;
		}
	}

	return yaw;
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

	if (OnSameTeam(target, attacker)) {
		return false;
	}

	return true;
}

/**
 * CheckArmor
 */
function CheckArmor(ent, damage, dflags) {
	if (!damage) {
		return 0;
	}

	if (dflags & DAMAGE.NO_ARMOR) {
		return 0;
	}

	var client = ent.client;
	if (!client) {
		return 0;
	}

	var count = client.ps.stats[STAT.ARMOR];
	var save = Math.ceil(damage * ARMOR_PROTECTION);
	if (save >= count) {
		save = count;
	}

	if (!save) {
		return 0;
	}

	client.ps.stats[STAT.ARMOR] -= save;

	return save;
}

/**
 * AddScore
 *
 * Adds score to both the client and his team
 */
function AddScore(ent, origin, score) {
	var client = ent.client;

	if (!client) {
		return;
	}

	// No scoring during pre-match warmup.
	if (level.arena.state.current <= GS.COUNTDOWN) {
		return;
	}

	// Show score plum.
	ScorePlum(ent, origin, score);

	client.ps.persistant[PERS.SCORE] += score;

	if (level.arena.gametype === GT.TEAM) {
		level.arena.teamScores[client.ps.persistant[PERS.TEAM]] += score;
	}

	CalculateRanks();
}

/**
 * ScorePlum
 */
function ScorePlum(ent, origin, score) {
	var plum = TempEntity(origin, EV.SCOREPLUM);

	// Only send this temp entity to a single client.
	plum.r.svFlags |= SVF.SINGLECLIENT;
	plum.r.singleClient = ent.s.number;
	plum.s.otherEntityNum = ent.s.number;
	plum.s.time = score;
}

/**
 * TossClientItems
 *
 * Toss the weapon and powerups for the killed player
 */
function TossClientItems(self) {
	// Don't drop items in CA.
	if (level.arena.gametype >= GT.CLANARENA) {
		return;
	}

	// Drop the weapon if not a gauntlet or machinegun.
	var weapon = self.s.weapon;

	// Make a special check to see if they are changing to a new
	// weapon that isn't the mg or gauntlet. Without this, a client
	// can pick up a weapon, be killed, and not drop the weapon because
	// their weapon change hasn't completed yet and they are still holding the MG.
	if (weapon === WP.MACHINEGUN || weapon === WP.GRAPPLING_HOOK) {
		if (self.client.ps.weaponstate === WS.DROPPING) {
			weapon = self.client.pers.cmd.weapon;
		}
		if (!(self.client.ps.stats[STAT.WEAPONS] & (1 << weapon))) {
			weapon = WP.NONE;
		}
	}

	if (weapon > WP.MACHINEGUN && weapon !== WP.GRAPPLING_HOOK && self.client.ps.ammo[weapon]) {
		// Find the item type for this weapon.
		var item = BG.FindItemForWeapon(weapon);

		// Spawn the item.
		ItemDrop(self, item, 0);
	}

	// Drop all the powerups if not in teamplay.
	if (level.arena.gametype !== GT.TEAM) {
		var angle = 45;
		for (var i = 1; i < PW.NUM_POWERUPS; i++) {
			if (self.client.ps.powerups[i] > level.time) {
				var item = BG.FindItemForPowerup(i);
				if (!item) {
					continue;
				}
				var drop = ItemDrop(self, item, angle);
				// Decide how many seconds it has left.
				drop.count = (self.client.ps.powerups[i] - level.time) / 1000;
				if (drop.count < 1) {
					drop.count = 1;
				}
				angle += 45;
			}
		}
	}
}
