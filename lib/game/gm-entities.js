var entityEvents = {};

// Maps entity definition values to entity values.
var keyMap = {
	'origin': ['s.origin', 'currentOrigin'],
	'angles': ['s.angles']
};

/**
 * SpawnEntity
 */
function SpawnEntity() {
	for (var i = MAX_CLIENTS; i < MAX_GENTITIES; i++) {
		var ent = level.gentities[i];

		if (ent.inuse) {
			continue;
		}

		// We don't immediately re-use freed entities, it can cause confusion
		// in the client snapshots. However, the first couple seconds of
		// server time can involve a lot of freeing and allocating, so relax
		// the replacement policy
		if (ent.freetime > level.startTime + 2000 && level.time - ent.freetime < 1000) {
			continue;
		}

		ent.reset();
		ent.s.number = i;
		ent.inuse = true;

		return ent;
	}

	return null;//throw new Error('Game entities is full');
}

/**
 * FreeEntity
 */
function FreeEntity(ent) {
	sv.UnlinkEntity(ent); // unlink from world

	ent.classname = 'freed';
	ent.freetime = level.time;
	ent.inuse = false;
}

/**
 * TempEntity
 *
 * Spawns an event entity that will be auto-removed.
 * The origin will be snapped to save net bandwidth, so care
 * must be taken if the origin is right on a surface (snap towards start vector first).
 */
function TempEntity(origin, event) {
	var e = SpawnEntity();
	e.s.eType = EntityType.EVENTS + event;

	e.classname = 'tempEntity';
	e.eventTime = level.time;
	e.freeAfterEvent = true;

	// vec3.set(origin, snapped);
	// SnapVector(snapped);  // save network bandwidth
	SetOrigin(e, origin);

	sv.LinkEntity(e);

	return e;
}


/**
 * FindEntity
 */
function FindEntity(key, value) {
	var results = [];

	for (var i = 0; i < level.gentities.length; i++) {
		var ent = level.gentities[i];
		if (!ent.inuse) {
			continue;
		}

		if (ent[key] === value) {
			results.push(ent);
		}
	}

	return results;
}

/**
 * SetOrigin
 * 
 * Set the entities current origin as well as the entity's
 * associated trajectory information to make it stationary.
 */
function SetOrigin(ent, origin) {
	vec3.set(origin, ent.s.pos.trBase);
	ent.s.pos.trType = TrajectoryType.STATIONARY;
	ent.s.pos.trTime = 0;
	ent.s.pos.trDuration = 0;
	vec3.set([0, 0, 0], ent.s.pos.trDelta);

	vec3.set(origin, ent.currentOrigin);
}

/**
 * EntityThink
 */
function EntityThink(ent) {
	var thinktime = ent.nextthink;

	if (thinktime <= 0) {
		return;
	} else if (thinktime > level.time) {
		return;
	}
	
	ent.nextthink = 0;

	if (!ent.think) {
		error('NULL ent->think');
	}

	ent.think.call(this, ent);
}

/**
 * EntityPickTarget
 */
function EntityPickTarget(targetName) {
	if (!targetName) {
		error('EntityPickTarget called with NULL targetname');
	}

	var choices = FindEntity('targetname', targetName);

	if (!choices.length) {
		error('EntityPickTarget: target ' + targetName + ' not found');
	}

	return choices[Math.floor(Math.random()*choices.length)];
}

/**
 * SpawnEntityFromDef
 */
function SpawnEntityFromDef(def) {
	var ent = SpawnEntity();

	// Merge definition info into the entity.
	for (var defKey in def) {
		if (!def.hasOwnProperty(defKey)) {
			continue;
		}

		// Use the mapping if it exists.
		var entKeys = keyMap[defKey] || [defKey];

		// Set all mapped keys.
		for (var i = 0; i < entKeys.length; i++) {
			var entKey = entKeys[i];

			// Don't merge keys that aren't expected.
			// TODO Do we have to use eval?
			var val = eval('ent.' + entKey);
			if (val === undefined) {
				continue;
			}
			eval('ent.' + entKey + ' = def[defKey]');
		}
	}
	
	// Merge entity-specific callbacks in.
	if (entityEvents[ent.classname]) {
		_.extend(ent, entityEvents[ent.classname]);
	}

	// Call spawn function if it exists.
	var spawn;

	// See if we should spawn this as an item.
	for (var i = 0; i < bg.ItemList.length; i++) {
		var item = bg.ItemList[i];

		if (item.classname === ent.classname) {
			SpawnItem(ent, item);
			return;
		}
	}

	if (!ent.spawn) {
		FreeEntity(ent);
		//log(ent.classname + ' doesn\'t have a spawn function', ent.targetname);
		return;
	}

	ent.spawn.call(this, ent);
}

/**
 * SpawnAllEntitiesFromDefs
 *
 * Spawns all the map entities into the game.
 */
function SpawnAllEntitiesFromDefs() {
	var entityDefs = sv.GetEntityDefs();

	for (var i = 0; i < entityDefs.length; i++) {
		var def = entityDefs[i];
		SpawnEntityFromDef(def);
	}
}