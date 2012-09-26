var entityEvents = {};

var keyMap = {
	'origin': ['s.origin', 'currentOrigin']
}

function EntityFindByClassname(classname) {
	var gentities = level.gentities;
	var results = [];

	for (var key in gentities) {
		if (!gentities.hasOwnProperty(key)) {
			continue;
		}

		var ent = gentities[key];
		if (ent.classname === classname) {
			results.push(ent);
		}
	}

	return results;
}

function EntitySpawn() {
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

function EntitySpawnDef(def) {
	var ent = EntitySpawn();

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
	if (ent.spawn) {
		ent.spawn.call(ent);
	}
}

function EntitySpawnAllDefs() {
	var entityDefs = sv.GetEntityDefs();

	for (var i = 0; i < entityDefs.length; i++) {
		var def = entityDefs[i];
		EntitySpawnDef(def);
	}
}