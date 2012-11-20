var RESPAWN = {
	ARMOR      : 25,
	HEALTH     : 35,
	AMMO       : 40,
	HOLDABLE   : 60,
	MEGAHEALTH : parseInt(35 / 120, 10),
	POWERUP    : 120
};

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
	
	//ent.physicsBounce = 0.50;		// items are bouncy
	
	/*if (item.giType == IT_POWERUP ) {
		G_SoundIndex( "sound/items/poweruprespawn.wav" );
		G_SpawnFloat( "noglobalsound", "0", &ent->speed);
	}*/
}

/**
 * FinishSpawningItem
 *
 * Traces down to find where an item should rest, instead of letting them
 * free fall from their spawn points
 */
function FinishSpawningItem(ent) {
	var itemIndex = bg.ItemList.indexOf(ent.item);

	vec3.set([-ITEM_RADIUS, -ITEM_RADIUS, -ITEM_RADIUS], ent.mins);
	vec3.set([ITEM_RADIUS, ITEM_RADIUS, ITEM_RADIUS], ent.maxs);

	ent.s.eType = ET.ITEM;
	ent.s.modelIndex = itemIndex;
	//ent.s.modelindex2 = 0; // zero indicates this isn't a dropped item

	ent.contents = CONTENTS.TRIGGER;
	ent.touch = TouchItem;
	//ent->use = Use_Item;

	//if (ent.spawnflags & 1) {
		// suspended
		SetOrigin(ent, ent.s.origin);
	//} else {
		// drop to floor
		/*var dest = vec3.create([ent.s.origin[0], ent.s.origin[1], ent.s.origin[2] - 4096]);

		trap_Trace( &tr, ent->s.origin, ent->r.mins, ent->r.maxs, dest, ent->s.number, MASK.SOLID );
		if ( tr.startsolid ) {
			G_Printf ("FinishSpawningItem: %s startsolid at %s\n", ent->classname, vtos(ent->s.origin));
			G_FreeEntity( ent );
			return;
		}

		// allow to ride movers
		ent->s.groundEntityNum = tr.entityNum;

		G_SetOrigin( ent, tr.endPos );*/
	//}

	/*// team slaves and targeted items aren't present at start
	if ( ( ent->flags & FL_TEAMSLAVE ) || ent->targetName ) {
		ent->s.eFlags |= EF_NODRAW;
		ent->r.contents = 0;
		return;
	}

	// powerups don't spawn in for a while
	if ( ent->item->giType == IT_POWERUP ) {
		float	respawn;

		respawn = 45 + crandom() * 15;
		ent->s.eFlags |= EF_NODRAW;
		ent->r.contents = 0;
		ent->nextthink = level.time + respawn * 1000;
		ent->think = RespawnItem;
		return;
	}*/

	sv.LinkEntity(ent);
}

/**
 * RespawnItem
 */
function RespawnItem(self) {
// 	// randomly select from teamed entities
// 	if (self.team) {
// 		gentity_t	*master;
// 		int	count;
// 		int choice;
// 
// 		if ( !ent->teammaster ) {
// 			G_Error( "RespawnItem: bad teammaster");
// 		}
// 		master = ent->teammaster;
// 
// 		for (count = 0, ent = master; ent; ent = ent->teamchain, count++)
// 			;
// 
// 		choice = rand() % count;
// 
// 		for (count = 0, ent = master; count < choice; ent = ent->teamchain, count++)
// 			;
// 	}
	
	self.contents = CONTENTS.TRIGGER;
	self.s.eFlags &= ~EF.NODRAW;
	self.svFlags &= ~SVF.NOCLIENT;
	sv.LinkEntity(self);

// 	if ( self.item.giType == IT.POWERUP ) {
// 		// play powerup spawn sound to all clients
// 		var tent;
// 
// 		// if the powerup respawn sound should Not be global
// 		if (self.speed) {
// 			tent = G_TempEntity( ent->s.pos.trBase, EV_GENERAL_SOUND );
// 		}
// 		else {
// 			tent = G_TempEntity( ent->s.pos.trBase, EV_GLOBAL_SOUND );
// 		}
// 		tent.s.eventParm = G_SoundIndex( "sound/items/poweruprespawn.wav" );
// 		tent.svFlags |= SVF.BROADCAST;
// 	}
// 
// 	if ( self.item.giType == IT.HOLDABLE && self.item.giTag == HI_KAMIKAZE ) {
// 		// play powerup spawn sound to all clients
// 		gentity_t	*te;
// 
// 		// if the powerup respawn sound should Not be global
// 		if (self.speed) {
// 			te = G_TempEntity( ent->s.pos.trBase, EV_GENERAL_SOUND );
// 		}
// 		else {
// 			te = G_TempEntity( ent->s.pos.trBase, EV_GLOBAL_SOUND );
// 		}
// 		te->s.eventParm = G_SoundIndex( "sound/items/kamikazerespawn.wav" );
// 		te->r.svFlags |= SVF_BROADCAST;
// 	}
// 
// play the normal respawn sound only to nearby clients
// 	G_AddEvent( ent, EV_ITEM_RESPAWN, 0 );
// 
	self.nextthink = 0;
}

/**
 * TouchItem
 */
function TouchItem(self, other) {
	var respawn,
		predict;
	
	if (!other.client) { return; }
//	if (!other.health || other.health < 1) { return; } // dead people can't pickup
	
	// The same pickup rules are used for client side and server side.
	if (!bg.CanItemBeGrabbed(/*g_gametype()*/ null, self.s, other.client.ps)) {
		return;
	}

// 	G_LogPrintf( "Item: %i %s\n", other->s.number, ent->item->classname );
// 
// 	predict = other.client.pers['predictItemPickup'];
	
	// call the item-specific pickup function
	switch (self.item.giType) {
		case IT.WEAPON:
			respawn = PickupWeapon(self, other);
			break;
		case IT.AMMO:
			respawn = PickupAmmo(self, other);
			break;
		case IT.ARMOR:
			respawn = PickupArmor(self, other);
			break;
		case IT.HEALTH:
			respawn = PickupHealth(self, other);
			break;
		case IT.POWERUP:
			respawn = PickupPowerup(self, other);
			predict = false;
			break;
		case IT.TEAM:
			respawn = PickupTeam(self, other);
			break;
		case IT.HOLDABLE:
			respawn = PickupHoldable(self, other);
			break;
		default:
			return;
	}
	
	if (!respawn) { return; }
	
// 	// play the normal pickup sound
// 	if (predict) {
		bg.AddPredictableEventToPlayerstate(other.client.ps, EV.ITEM_PICKUP, self.s.modelIndex);
// 	} else {
// 		G_AddEvent( other, EV.ITEM_PICKUP, self.s.modelindex );
// 	}
// 
// 	// powerup pickups are global broadcasts
// 	if ( self.item->giType == IT.POWERUP || self.item->giType == IT.TEAM) {
// 		// if we want the global sound to play
// 		if (!self.speed) {
// 			gentity_t	*te;
// 
// 			te = G_TempEntity( self.s.pos.trBase, EV_GLOBAL_ITEM_PICKUP );
// 			te->s.eventParm = self.s.modelindex;
// 			te->r.svFlags |= SVF_BROADCAST;
// 		} else {
// 			gentity_t	*te;
// 
// 			te = G_TempEntity( self.s.pos.trBase, EV_GLOBAL_ITEM_PICKUP );
// 			te->s.eventParm = self.s.modelindex;
// 			// only send this temp entity to a single client
// 			te->r.svFlags |= SVF_SINGLECLIENT;
// 			te->r.singleClient = other->s.number;
// 		}
// 	}
// 
// 	// fire item targets
// 	G_UseTargets (ent, other);

	// Wait of -1 will not respawn.
	if (self.wait === -1) {
		self.svFlags |= SVF.NOCLIENT;
		self.s.eFlags |= EF.NODRAW;
		self.contents = 0;
		self.unlinkAfterEvent = true;
		return;
	}
	
	// Non-zero wait overrides respawn time.
	if (self.wait) {
		respawn = self.wait;
	}
	
	// Random can be used to vary the respawn time.
	if (self.random) {
		respawn += Math.random() * self.random;
		if (respawn < 1) {
			respawn = 1;
		}
	}
	
// 	// Dropped items will not respawn.
// 	if ( self.flags & FL_DROPPED_ITEM ) {
// 		self.freeAfterEvent = true;
// 	}
	
	// Picked up items still stay around, they just don't
	// draw anything.  This allows respawnable items
	// to be placed on movers.
	self.svFlags |= SVF.NOCLIENT;
	self.s.eFlags |= EF.NODRAW;
	self.contents = 0;
	
	// A negative respawn times means to never respawn this item (but don't 
	// delete it).  This is used by items that are respawned by third party 
	// events such as ctf flags
	if (respawn <= 0) {
		self.nextthink = 0;
		self.think = 0;
	} else {
		self.nextthink = level.time + (respawn * 1000);
		self.think = RespawnItem;
	}
	
	sv.LinkEntity(self);
}

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

		// // dropped items and teamplay weapons always have full ammo
		// if ( ! (ent->flags & FL_DROPPED_ITEM) && g_gametype.integer != GT_TEAM ) {
		// 	// respawning rules
		// 	// drop the quantity if the already have over the minimum
		// 	if ( other->client->ps.ammo[ ent->item->giTag ] < quantity ) {
		// 		quantity = quantity - other->client->ps.ammo[ ent->item->giTag ];
		// 	} else {
		// 		quantity = 1;		// only add a single shot
		// 	}
		// }
	}
	
	// Add the weapon.
	other.client.ps.stats[STAT.WEAPONS] |= (1 << ent.item.giTag);
	
	AddAmmo(other, ent.item.giTag, quantity);
	
	// team deathmatch has slow weapon respawns
	// if ( g_gametype.integer == GT_TEAM ) {
	// 	return g_weaponTeamRespawn.integer;
	// }
	
	return g_weaponRespawn();
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
	
	// small and mega healths will go over the max
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
	
	if (ent.item.quantity == 100) {		// mega health respawns slow
		return RESPAWN.MEGAHEALTH;
	}
	
	return RESPAWN.HEALTH;
}

/**
 * PickupPowerup
 */
function PickupPowerup(ent, other) {
	var quantity,
		i,
		client;
	
	if (other.client.ps.powerups[ent.item.giTag]) {
		// round timing to seconds to make multiple powerup timers
		// count in sync
		other.client.ps.powerups[ent.item.giTag] = level.time - ( level.time % 1000 );
	}
	
	if (ent.count) {
		quantity = ent.count;
	} else {
		quantity = ent.item.quantity;
	}
	
	other.client.ps.powerups[ent.item.giTag] += quantity * 1000;
	
	return RESPAWN.POWERUP;
}

/**
 * TODO : Stub functions for now
 */
function PickupTeam(ent, other) { return 0; }
function PickupHoldable(ent, other) { return RESPAWN.HOLDABLE; }
