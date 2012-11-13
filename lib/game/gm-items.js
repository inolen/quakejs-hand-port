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

	/*if (item->giType == IT_POWERUP ) {
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
 * TouchItem
 */
function TouchItem(self, other) {
	var respawn;

	switch (self.item.giType) {
		case IT.WEAPON:
			respawn = PickupWeapon(self, other);
			break;
	}
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

	// return g_weaponRespawn.integer;

	return 0;
}