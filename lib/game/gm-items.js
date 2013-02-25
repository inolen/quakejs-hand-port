/**
 * SpawnItem
 *
 * Sets the clipping size and plants the object on the floor.
 * Items can't be immediately dropped to floor, because they might
 * be on an entity that hasn't spawned yet.
 */
function SpawnItem(ent, item) {
	ent.item = item;
	// Some movers spawn on the second frame, so delay item
	// spawns until the third frame so they can ride trains.
	ent.nextthink = level.time + FRAMETIME * 2;
	ent.think = FinishSpawningItem;

	ent.physicsBounce = 0.5;		// items are bouncy

	/*if (item.giType == IT_POWERUP ) {
		G_SoundIndex( "sound/items/poweruprespawn.wav" );
		G_SpawnFloat( "noglobalsound", "0", &ent.speed);
	}*/
}

/**
 * RunItem
 */
function RunItem(ent) {
	var trace = new QS.TraceResults();

	// If its groundentity has been set to none, it may have been pushed off an edge.
	if (!(ent.spawnflags & 1) && ent.s.groundEntityNum === ENTITYNUM_NONE) {
		if (ent.s.pos.trType !== TR.GRAVITY) {
			ent.s.pos.trType = TR.GRAVITY;
			ent.s.pos.trTime = level.time;
		}
	}

	if (ent.s.pos.trType === TR.STATIONARY) {
		// Check think function.
		RunEntity(ent);
		return;
	}

	// Get current position.
	var origin = vec3.create();
	BG.EvaluateTrajectory(ent.s.pos, level.time, origin);

	// Trace a line from the previous position to the current position.
	var mask;
	if (ent.clipmask) {
		mask = ent.clipmask;
	} else {
		mask = MASK.PLAYERSOLID & ~SURF.CONTENTS.BODY;//MASK_SOLID;
	}

	Trace(trace, ent.r.currentOrigin, origin, ent.r.mins, ent.r.maxs, ent.r.ownerNum, mask);

	if (trace.startSolid) {
		trace.fraction = 0;
	}

	vec3.set(trace.endPos, ent.r.currentOrigin);

	SV.LinkEntity(ent);

	// Check think function.
	RunEntity(ent);

	if (trace.fraction === 1) {
		return;
	}

	// If it is in a nodrop volume, remove it.
	var contents = PointContents(ent.r.currentOrigin, -1);
	if (contents & SURF.CONTENTS.NODROP) {
		if (ent.item && ent.item.giType === IT.TEAM) {
			Team_FreeEntity(ent);
		} else {
			FreeEntity(ent);
		}
		return;
	}

	BounceItem(ent, trace);
}

/**
 * BounceItem
 */
function BounceItem(ent, trace) {
	// Reflect the velocity on the trace plane.
	var hitTime = level.previousTime + (level.time - level.previousTime) * trace.fraction;
	var velocity = vec3.create();
	BG.EvaluateTrajectoryDelta(ent.s.pos, hitTime, velocity);
	var dot = vec3.dot(velocity, trace.plane.normal);
	vec3.add(vec3.scale(trace.plane.normal, -2 * dot, ent.s.pos.trDelta), velocity);

	// Cut the velocity to keep from bouncing forever.
	vec3.scale(ent.s.pos.trDelta, ent.physicsBounce, ent.s.pos.trDelta);

	// Check for stop.
	if (trace.plane.normal[2] > 0 && ent.s.pos.trDelta[2] < 40) {
		trace.endPos[2] += 1.0;  // make sure it is off ground
		// SnapVector( trace.endPos );
		SetOrigin(ent, trace.endPos);
		ent.s.groundEntityNum = trace.entityNum;
		return;
	}

	vec3.add(ent.r.currentOrigin, trace.plane.normal);
	vec3.set(ent.r.currentOrigin, ent.s.pos.trBase);
	ent.s.pos.trTime = level.time;
}

/**
 * FinishSpawningItem
 *
 * Traces down to find where an item should rest, instead of letting them
 * free fall from their spawn points
 */
function FinishSpawningItem(ent) {
	var itemIndex = BG.ItemList.indexOf(ent.item);
	var trace = new QS.TraceResults();

	vec3.set([-ITEM_RADIUS, -ITEM_RADIUS, -ITEM_RADIUS], ent.r.mins);
	vec3.set([ITEM_RADIUS, ITEM_RADIUS, ITEM_RADIUS], ent.r.maxs);

	ent.s.eType = ET.ITEM;
	ent.s.modelIndex = itemIndex;
	ent.s.modelIndex2 = 0; // zero indicates this isn't a dropped item

	ent.r.contents = SURF.CONTENTS.TRIGGER;
	ent.touch = ItemTouch;
	//ent.use = ItemUse;

	if (ent.spawnflags & 1) {
		// Suspended.
		SetOrigin(ent, ent.s.origin);
	} else {
		// Drop to floor.
		var dest = vec3.createFrom(
			ent.s.origin[0],
			ent.s.origin[1],
			ent.s.origin[2] - 4096
		);

		Trace(trace, ent.s.origin, dest, ent.r.mins, ent.r.maxs, ent.s.number, MASK.SOLID);
		if (trace.startSolid) {
			log('FinishSpawningItem:', ent.classname, 'startsolid at', ent.s.origin[0], ent.s.origin[1], ent.s.origin[2]);
			FreeEntity(ent);
			return;
		}

		// Allow to ride movers.
		ent.s.groundEntityNum = trace.entityNum;

		SetOrigin(ent, trace.endPos);
	}

	// Team slaves and targeted items aren't present at start.
	if ((ent.flags & GFL.TEAMSLAVE) || ent.targetName) {
		ent.s.eFlags |= EF.NODRAW;
		ent.r.contents = 0;
		return;
	}

	// Powerups don't spawn in for a while.
	if (ent.item.giType === IT.POWERUP) {
		var respawn = 45 + QMath.crandom() * 15;
		ent.s.eFlags |= EF.NODRAW;
		ent.r.contents = 0;
		ent.nextthink = level.time + respawn * 1000;
		ent.think = RespawnItem;
		return;
	}

	SV.LinkEntity(ent);
}

/**
 * RespawnItem
 */
function RespawnItem(ent) {
	// Randomly select from teamed entities.
	if (ent.team) {
		if (!ent.teammaster) {
			error('RespawnItem: bad teammaster');
		}
		var count;
		var choice;
		var master = ent.teammaster;

		for (count = 0, ent = master; ent; ent = ent.teamchain, count++) { }

		choice = QMath.irrandom(0, count - 1);

		for (count = 0, ent = master; count < choice; ent = ent.teamchain, count++) { }
	}

	ent.r.contents = SURF.CONTENTS.TRIGGER;
	ent.s.eFlags &= ~EF.NODRAW;
	ent.r.svFlags &= ~SVF.NOCLIENT;
	SV.LinkEntity(ent);

	if (ent.item.giType === IT.POWERUP) {
		// Play powerup spawn sound to all clients.
		var tent;

		// If the powerup respawn sound should Not be global.
		if (ent.speed) {
			tent = TempEntity(ent.s.pos.trBase, EV.GENERAL_SOUND);
		}
		else {
			tent = TempEntity(ent.s.pos.trBase, EV.GLOBAL_SOUND);
		}
		// tent.s.eventParm = G_SoundIndex( "sound/items/poweruprespawn.wav" );
		tent.r.svFlags |= SVF.BROADCAST;
	}

	if (ent.item.giType === IT.HOLDABLE) {
		// Play powerup spawn sound to all clients.
		var tent;

		// If the powerup respawn sound should Not be global.
		if (ent.speed) {
			tent = TempEntity(ent.s.pos.trBase, EV.GENERAL_SOUND);
		}
		else {
			tent = TempEntity(ent.s.pos.trBase, EV.GLOBAL_SOUND);
		}
		// te.s.eventParm = G_SoundIndex( "sound/items/kamikazerespawn.wav" );
		tent.r.svFlags |= SVF.BROADCAST;
	}

	// Play the normal respawn sound only to nearby clients.
	AddEvent(ent, EV.ITEM_RESPAWN, 0);

	ent.nextthink = 0;
}

/**
 * ItemTouch
 */
function ItemTouch(ent, other) {
	if (!other.client) {
		return;
	}

	if (other.client.ps.pm_type === PM.DEAD) {
		return;  // dead people can't pickup
	}

	// The same pickup rules are used for client side and server side.
	if (!BG.CanItemBeGrabbed(level.arena.gametype, ent.s, other.client.ps)) {
		return;
	}

// 	G_LogPrintf( "Item: %i %s\n", other.s.number, ent.item.classname );
//
	var predict = true;// other.client.pers.predictItemPickup;

	// Call the item-specific pickup function.
	var respawn;
	switch (ent.item.giType) {
		case IT.WEAPON:
			respawn = PickupWeapon(ent, other);
			break;
		case IT.AMMO:
			respawn = PickupAmmo(ent, other);
			break;
		case IT.ARMOR:
			respawn = PickupArmor(ent, other);
			break;
		case IT.HEALTH:
			respawn = PickupHealth(ent, other);
			break;
		case IT.POWERUP:
			respawn = PickupPowerup(ent, other);
			predict = false;
			break;
		case IT.TEAM:
			respawn = Team_PickupItem(ent, other);
			break;
		case IT.HOLDABLE:
			respawn = PickupHoldable(ent, other);
			break;
		default:
			return;
	}

	if (!respawn) { return; }

	// Play the normal pickup sound.
	if (predict) {
		AddPredictableEvent(other, EV.ITEM_PICKUP, ent.s.modelIndex);
	} else {
		AddEvent(other, EV.ITEM_PICKUP, ent.s.modelIndex);
	}

	// Powerup pickups are global broadcasts.
	if (ent.item.giType === IT.POWERUP || ent.item.giType === IT.TEAM) {
		var tent;
		// If we want the global sound to play.
		if (!ent.speed) {
			tent = TempEntity(ent.s.pos.trBase, EV.GLOBAL_ITEM_PICKUP);
			tent.s.eventParm = ent.s.modelIndex;
			tent.r.svFlags |= SVF.BROADCAST;
		} else {
			tent = TempEntity(ent.s.pos.trBase, EV.GLOBAL_ITEM_PICKUP);
			tent.s.eventParm = ent.s.modelIndex;
			// Only send this temp entity to a single client.
			tent.r.svFlags |= SVF.r.singleClient;
			tent.r.singleClient = other.s.number;
		}
	}

	// Fire item targets.
	UseTargets(ent, other);

	// Wait of -1 will not respawn.
	if (ent.wait === -1) {
		ent.r.svFlags |= SVF.NOCLIENT;
		ent.s.eFlags |= EF.NODRAW;
		ent.r.contents = 0;
		ent.unlinkAfterEvent = true;
		return;
	}

	// Non-zero wait overrides respawn time.
	if (ent.wait) {
		respawn = ent.wait;
	}

	// Random can be used to vary the respawn time.
	if (ent.random) {
		respawn += Math.random() * ent.random;
		if (respawn < 1) {
			respawn = 1;
		}
	}

	// Dropped items will not respawn.
	if (ent.flags & GFL.DROPPED_ITEM) {
		ent.freeAfterEvent = true;
	}

	// Picked up items still stay around, they just don't
	// draw anything.  This allows respawnable items
	// to be placed on movers.
	ent.r.svFlags |= SVF.NOCLIENT;
	ent.s.eFlags |= EF.NODRAW;
	ent.r.contents = 0;

	// A negative respawn times means to never respawn this item (but don't
	// delete it).  This is used by items that are respawned by third party
	// events such as ctf flags
	if (respawn <= 0) {
		ent.nextthink = 0;
		ent.think = 0;
	} else {
		ent.nextthink = level.time + (respawn * 1000);
		ent.think = RespawnItem;
	}

	SV.LinkEntity(ent);
}

/**
 * Items are any object that a player can touch to gain some effect.
 *
 * Pickup will return the number of seconds until they should respawn.
 *
 * All items should pop when dropped in lava or slime.
 *
 * Respawnable items don't actually go away when picked up, they are
 * just made invisible and untouchable. This allows them to ride
 * movers and respawn apropriately.
 */

var RESPAWN = {
	ARMOR      : 25,
	HEALTH     : 35,
	AMMO       : 40,
	HOLDABLE   : 60,
	MEGAHEALTH : 35,
	POWERUP    : 120
};

/**
 * PickupWeapon
 */
function PickupWeapon(ent, other) {
	var quantity;

	if (ent.count < 0) {
		quantity = 0; // None for you, sir!
	} else {
		if (ent.count) {
			quantity = ent.count;
		} else {
			quantity = ent.item.quantity;
		}

		// Dropped items and teamplay weapons always have full ammo.
		if (!(ent.flags & GFL.DROPPED_ITEM) && level.arena.gametype !== GT.TEAM ) {
			// Respawning rules.
			// Drop the quantity if they already have over the minimum.
			if (other.client.ps.ammo[ent.item.giTag] < quantity) {
				quantity = quantity - other.client.ps.ammo[ent.item.giTag];
			} else {
				quantity = 1;  // only add a single shot
			}
		}
	}

	// Add the weapon.
	other.client.ps.stats[STAT.WEAPONS] |= (1 << ent.item.giTag);

	AddAmmo(other, ent.item.giTag, quantity);

	// Team deathmatch has slow weapon respawns.
	if (level.arena.gametype === GT.TEAM) {
		return g_weaponTeamRespawn.get();
	}

	return g_weaponRespawn.get();
}

/**
 * PickupAmmo
 */
function PickupAmmo(ent, other) {
	var quantity;

	if (ent.count) {
		quantity = ent.count;
	} else {
		quantity = ent.item.quantity;
	}

	AddAmmo(other, ent.item.giTag, quantity);

	return RESPAWN.AMMO;
}

/**
 * AddAmmo
 */
function AddAmmo(ent, weapon, count) {
	ent.client.ps.ammo[weapon] += count;

	if (ent.client.ps.ammo[weapon] > 200) {
		ent.client.ps.ammo[weapon] = 200;
	}
}

/**
 * PickupArmor
 */
function PickupArmor(ent, other) {
	other.client.ps.stats[STAT.ARMOR] += ent.item.quantity;

	if (other.client.ps.stats[STAT.ARMOR] > other.client.ps.stats[STAT.MAX_HEALTH] * 2) {
		other.client.ps.stats[STAT.ARMOR] = other.client.ps.stats[STAT.MAX_HEALTH] * 2;
	}

	return RESPAWN.ARMOR;
}

/**
 * PickupHealth
 */
function PickupHealth(ent, other) {
	var max,
		quantity;

	// Small and mega healths will go over the max.
	if (ent.item.quantity != 5 && ent.item.quantity != 100) {
		max = other.client.ps.stats[STAT.MAX_HEALTH];
	} else {
		max = other.client.ps.stats[STAT.MAX_HEALTH] * 2;
	}

	if (ent.count) {
		quantity = ent.count;
	} else {
		quantity = ent.item.quantity;
	}

	other.health += quantity;

	if (other.health > max) {
		other.health = max;
	}

	other.client.ps.stats[STAT.HEALTH] = other.health;

	if (ent.item.quantity == 100) {  // mega health respawns slow
		return RESPAWN.MEGAHEALTH;
	}

	return RESPAWN.HEALTH;
}

/**
 * PickupPowerup
 */
function PickupPowerup(ent, other) {
	var trace = new QS.TraceResults();

	if (!other.client.ps.powerups[ent.item.giTag]) {
		// round timing to seconds to make multiple powerup timers
		// count in sync
		other.client.ps.powerups[ent.item.giTag] = level.time - ( level.time % 1000 );
	}

	var quantity;
	if (ent.count) {
		quantity = ent.count;
	} else {
		quantity = ent.item.quantity;
	}

	other.client.ps.powerups[ent.item.giTag] += quantity * 1000;

	// Give any nearby players a "denied" anti-reward.
	for (var i = 0; i < MAX_CLIENTS; i++) {
		var client = level.clients[i];
		if (client === other.client) {
			continue;
		}
		if (client.pers.connected === CON.DISCONNECTED) {
			continue;
		}
		if (client.ps.pm_type === PM.DEAD) {
			continue;
		}

		// If same team in team game, no sound.
		// Cannot use OnSameTeam as it expects to g_entities, not clients.
		if (level.arena.gametype >= GT.TEAM && other.client.sess.team === client.sess.team) {
			continue;
		}

		// If too far away, no sound.
		var delta = vec3.subtract(ent.s.pos.trBase, client.ps.origin, vec3.create());
		var len = vec3.normalize(delta);
		if (len > 192) {
			continue;
		}

		// If not facing, no sound.
		var forward = vec3.create();
		QMath.AnglesToVectors(client.ps.viewangles, forward, null, null);
		if (vec3.dot(delta, forward) < 0.4) {
			continue;
		}

		// If not line of sight, no sound.
		Trace(trace, client.ps.origin, ent.s.pos.trBase, null, null, ENTITYNUM_NONE, SURF.CONTENTS.SOLID);
		if (trace.fraction !== 1.0) {
			continue;
		}

		// Anti-reward.
		client.ps.persistant[PERS.PLAYEREVENTS] ^= PLAYEREVENTS.DENIEDREWARD;
	}

	return RESPAWN.POWERUP;
}

/**
 * TODO : Stub functions for now
 */
// function PickupTeam(ent, other) { return 0; } // function is in gm-team.js
function PickupHoldable(ent, other) { return RESPAWN.HOLDABLE; }


//======================================================================

/**
 * ItemDrop
 *
 * Spawns an item and tosses it forward
 */
function ItemDrop(ent, item, angle) {
	var velocity = vec3.create();
	var angles   = vec3.create();

	vec3.set(ent.s.apos.trBase, angles);
	angles[QMath.YAW] += angle;
	angles[QMath.PITCH] = 0;  // always forward

	QMath.AnglesToVectors(angles, velocity, null, null);
	vec3.scale(velocity, 150, velocity);
	velocity[2] += 200 + QMath.crandom() * 50;

	// Create dropped item.
	var dropped = SpawnEntity();

	dropped.s.eType = ET.ITEM;
	dropped.s.modelIndex = BG.ItemList.indexOf(item);  // store item number in modelindex
	dropped.s.modelIndex2 = 1;  // This is non-zero is it's a dropped item

	dropped.classname = item.classname;
	dropped.item = item;
	vec3.set([-ITEM_RADIUS, -ITEM_RADIUS, -ITEM_RADIUS], dropped.r.mins);
	vec3.set([ITEM_RADIUS, ITEM_RADIUS, ITEM_RADIUS], dropped.r.maxs);
	dropped.r.contents = SURF.CONTENTS.TRIGGER;

	dropped.touch = ItemTouch;

	SetOrigin(dropped, ent.s.pos.trBase);
	dropped.s.pos.trType = TR.GRAVITY;
	dropped.s.pos.trTime = level.time;
	vec3.set(velocity, dropped.s.pos.trDelta);

	dropped.s.eFlags |= EF.BOUNCE_HALF;

	if ((level.arena.gametype == GT.CTF || level.arena.gametype == GT.NFCTF) && item.giType == IT.TEAM) { // Special case for CTF flags
		dropped.think = Team_DroppedFlagThink;
		dropped.nextthink = level.time + 30000;
		Team_CheckDroppedItem(dropped);
	} else {  // auto-remove after 30 seconds
		dropped.think = FreeEntity;
		dropped.nextthink = level.time + 30000;
	}

	dropped.flags = GFL.DROPPED_ITEM;

	SV.LinkEntity(dropped);

	return dropped;
}

/**
 * ItemUse
 *
 * Respawn the item.
 */
function ItemUse(ent, other, activator) {
	RespawnItem(ent);
}
