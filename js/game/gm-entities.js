var entityEvents = {};

var keyMap = {
	'origin': ['s.origin', 'currentOrigin']
}

function SpawnEntity() {
	for (var i = MAX_CLIENTS; i < MAX_GENTITIES; i++) {
		if (level.gentities[i]) {
			continue;
		}

		var ent = level.gentities[i] = new GameEntity();
		ent.s.number = i;
		return ent;
	}

	throw new Error('Game entities is full');
}

function FreeEntity(ent) {
	sv.UnlinkEntity(ent); // unlink from world
	delete level.gentities[ent.s.number];
}

function FindEntity(key, value) {
	var results = [];

	for (var i = 0; i < level.gentities.length; i++) {
		var ent = level.gentities[i];

		if (!ent) {
			continue;
		}

		if (ent[key] === value) {
			results.push(ent);
		}
	}

	return results;
}

function EntityThink(ent) {
	var thinktime = ent.nextthink;

	if (thinktime <= 0) {
		return;
	} else if (thinktime > level.time) {
		return;
	}
	
	ent.nextthink = 0;

	if (!ent.think) {
		throw new Error('NULL ent->think');
	}

	ent.think.call(this, ent);
}

function EntityPickTarget(targetName) {
	if (!targetName) {
		throw new Error('SV: EntityPickTarget called with NULL targetname');
	}

	var choices = FindEntity('targetname', targetName);

	if (!choices.length) {
		throw new Error('SV: EntityPickTarget: target ' + targetName + ' not found');
	}

	return choices[Math.floor(Math.random()*choices.length)];
}

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
	var item;
	var spawn;

	// See if we should spawn this as an item.
	if ((item = bg.ItemList[ent.classname])) {
		SpawnItem(ent, item);
		return;
	}

	if (ent.spawn) {
		ent.spawn.call(this, ent);
	}
}

function SpawnAllEntitiesFromDefs() {
	var entityDefs = sv.GetEntityDefs();

	for (var i = 0; i < entityDefs.length; i++) {
		var def = entityDefs[i];
		SpawnEntityFromDef(def);
	}
}