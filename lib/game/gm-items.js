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

		trap_Trace( &tr, ent->s.origin, ent->r.mins, ent->r.maxs, dest, ent->s.number, MASK_SOLID );
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
	if ( ( ent->flags & FL_TEAMSLAVE ) || ent->targetname ) {
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
// 	if (ent->team) {
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
	self.svFlags &= ~ServerFlags.NOCLIENT;
	
// 	trap_LinkEntity (ent);
// 
// 	if ( ent->item->giType == IT_POWERUP ) {
// 		// play powerup spawn sound to all clients
// 		gentity_t	*te;
// 
// 		// if the powerup respawn sound should Not be global
// 		if (ent->speed) {
// 			te = G_TempEntity( ent->s.pos.trBase, EV_GENERAL_SOUND );
// 		}
// 		else {
// 			te = G_TempEntity( ent->s.pos.trBase, EV_GLOBAL_SOUND );
// 		}
// 		te->s.eventParm = G_SoundIndex( "sound/items/poweruprespawn.wav" );
// 		te->r.svFlags |= SVF_BROADCAST;
// 	}
// 
// 	if ( ent->item->giType == IT_HOLDABLE && ent->item->giTag == HI_KAMIKAZE ) {
// 		// play powerup spawn sound to all clients
// 		gentity_t	*te;
// 
// 		// if the powerup respawn sound should Not be global
// 		if (ent->speed) {
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

// 	// the same pickup rules are used for client side and server side
// 	if ( !BG_CanItemBeGrabbed( g_gametype.integer, &ent->s, &other->client->ps ) ) {
// 		return;
// 	}
// 
// 	G_LogPrintf( "Item: %i %s\n", other->s.number, ent->item->classname );
// 
// 	predict = other.client.pers['predictItemPickup'];
	
	// call the item-specific pickup function
	switch (self.item.giType) {
		case IT.WEAPON:
			respawn = PickupWeapon(self, other);
			break;
		case IT.AMMO:
			respawn = Pickup_Ammo(self, other);
			break;
		case IT.ARMOR:
			respawn = Pickup_Armor(self, other);
			break;
		case IT.HEALTH:
			respawn = Pickup_Health(self, other);
			break;
		case IT.POWERUP:
			respawn = Pickup_Powerup(self, other);
			predict = false;
			break;
		case IT.TEAM:
			respawn = Pickup_Team(self, other);
			break;
		case IT.HOLDABLE:
			respawn = Pickup_Holdable(self, other);
			break;
		default:
			return;
	}
	
	if (!respawn) {
		return;
	}
// 	
// 	// play the normal pickup sound
// 	if (predict) {
// 		G_AddPredictableEvent( other, EV.ITEM_PICKUP, self.s.modelindex );
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

	// wait of -1 will not respawn
	if ( self.wait == -1 ) {
		self.svFlags |= ServerFlags.NOCLIENT;
		self.s.eFlags |= EF.NODRAW;
		self.contents = 0;
		self.unlinkAfterEvent = true;
		return;
	}
	
	// non zero wait overrides respawn time
	if ( self.wait ) {
		respawn = self.wait;
	}
	
	// random can be used to vary the respawn time
	if ( self.random ) {
		respawn += Math.random() * self.random;
		if ( respawn < 1 ) {
			respawn = 1;
		}
	}
	
// 	// dropped items will not respawn
// 	if ( self.flags & FL_DROPPED_ITEM ) {
// 		self.freeAfterEvent = true;
// 	}
	
	// picked up items still stay around, they just don't
	// draw anything.  This allows respawnable items
	// to be placed on movers.
	self.svFlags |= ServerFlags.NOCLIENT;
	self.s.eFlags |= EF.NODRAW;
	self.contents = 0;
	
	// ZOID
	// A negative respawn times means to never respawn this item (but don't 
	// delete it).  This is used by items that are respawned by third party 
	// events such as ctf flags
	if ( respawn <= 0 ) {
		self.nextthink = 0;
		self.think = 0;
	} else {
		self.nextthink = level.time + (respawn * 1000);
		self.think = RespawnItem;
	}
// 	trap_LinkEntity( ent );
}

/**
 * PickupWeapon
 */
function PickupWeapon(ent, other) {
	var quantity;

	if (ent.count < 0) {
		quantity = 0;
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

	// Add_Ammo( other, ent->item->giTag, quantity );

	// team deathmatch has slow weapon respawns
	// if ( g_gametype.integer == GT_TEAM ) {
	// 	return g_weaponTeamRespawn.integer;
	// }

	return g_weaponRespawn();
}

/**
 * TODO : Stub functions for now
 */
function Add_Ammo (ent, weapon, count) {  }
function Pickup_Ammo (ent, other) { return RESPAWN.AMMO; }
function Pickup_Armor(ent, other) { return RESPAWN.ARMOR; }
function Pickup_Health(ent, other) { return RESPAWN.HEALTH; }
function Pickup_Powerup(ent, other) { return RESPAWN.POWERUP; }
function Pickup_Team(ent, other) { return 0; }
function Pickup_Holdable(ent, other) { return RESPAWN.HOLDABLE; }
