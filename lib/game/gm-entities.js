var spawnFuncs = {};

// These fields are mapped from the entity definition
// to the spawned entity before the entity's spawn()
// function is invoked. Fields not in this list are
// optional and are only available through the Spawn*
// functions.
var fields = {
	'angle':      { type: 'anglehack', aliases: [QS.FTA('s.angles')] },
	'angles':     { type: 'vector', aliases: [QS.FTA('s.angles')] },
	'arena':      { type: 'int' },
	'classname':  { type: 'string' },
	'count':      { type: 'int' },
	'dmg':        { type: 'int', aliases: [QS.FTA('damage')] },
	'health':     { type: 'int' },
	'message':    { type: 'string' },
	'model':      { type: 'string' },
	'model2':     { type: 'string' },
	'origin':     { type: 'vector', aliases: [QS.FTA('r.currentOrigin'), QS.FTA('s.origin'), QS.FTA('s.pos.trBase')] },
	'random':     { type: 'float' },
	'spawnflags': { type: 'int' },
	'speed':      { type: 'float' },
	'target':     { type: 'string' },
	'targetname': { aliases: [QS.FTA('targetName')] },
	// TODO
	// 'targetShaderName':    { },
	// 'targetShaderNewName': { },
	'team':       { type: 'string' },
	'wait':       { type: 'float' }
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
		if (ent.freeTime > level.startTime + 2000 && level.time - ent.freeTime < 1000) {
			continue;
		}

		ent.reset();

		ent.inuse = true;
		ent.s.number = i;
		// ARENANUM_NONE used by body queue during init.
		ent.s.arenaNum = level.arena ? level.arena.arenaNum : ARENANUM_NONE;

		return ent;
	}

	error('Game entities is full');
}

/**
 * FreeEntity
 */
function FreeEntity(ent) {
	SV.UnlinkEntity(ent); // unlink from world

	if (ent.neverFree) {
		return;
	}

	ent.inuse = false;
	ent.classname = 'freed';
	ent.freeTime = level.time;
}

/**
 * GetEntityNum
 */
function GetEntityNum(ent) {
	return level.gentities.indexOf(ent);
}

/**
 * SpawnAllEntitiesFromDefs
 *
 * Spawns all the map entities into the game.
 */
function SpawnAllEntitiesFromDefs() {
	var entityDefs = SV.GetEntityDefs();

	for (var i = 0; i < entityDefs.length; i++) {
		var def = entityDefs[i];
		SpawnEntityFromDef(def);
	}

	// Chain together entities by team.
	ChainTeams();
}

/**
 * SpawnEntityFromDef
 */
function SpawnEntityFromDef(def) {
	var ent = SpawnEntity();

	// Store the key/value pairs in the static spawnVars
	// for use in the entity's spawn function.
	level.spawnVars = def;

	// Parse any known fields.
	for (var key in def) {
		if (!def.hasOwnProperty(key)) {
			continue;
		}

		ParseField(ent, key, def[key]);
	}

	// Check for "notteam" flag (GT.FFA, GT.TOURNAMENT).
	if (level.arena.gametype >= GT.TEAM) {
		var notteam = SpawnInt('notteam', 0);
		if (notteam) {
			SV.LinkEntity(ent);
			SV.AdjustAreaPortalState(ent, true);
			FreeEntity(ent);
			return;
		}
	} else {
		var notfree = SpawnInt('notfree', 0);
		if (notfree) {
			SV.LinkEntity(ent);
			SV.AdjustAreaPortalState(ent, true);
			FreeEntity(ent);
			return;
		}
	}

	// If a gametype attribute exists, don't spawn if it doesn't match
	// the current gametype.
	var gametype = SpawnString('gametype', null);
	if (gametype !== null) {
		if (level.arena.gametype >= GT.FFA && level.arena.gametype < GT.MAX_GAME_TYPE) {
			var gametypeName = BG.GametypeNames[level.arena.gametype];

			if (gametype.indexOf(gametypeName) === -1) {
				SV.LinkEntity(ent);
				SV.AdjustAreaPortalState(ent, true);
				FreeEntity(ent);
				return;
			}
		}
	}

	// Don't spawn items in CA modes.
	if (level.arena.gametype < GT.CLANARENA) {
		// See if we should spawn this as an item.
		for (var i = 1; i < BG.ItemList.length; i++) {
			var item = BG.ItemList[i];

			if (item.classname === ent.classname) {
				SpawnItem(ent, item);
				return;
			}
		}
	}

	// Grab the spawn function from the global object.
	ent.spawn = spawnFuncs[ent.classname];

	if (!ent.spawn) {
		log(ent.classname + ' doesn\'t have a spawn function');
		FreeEntity(ent);
		return;
	}

	ent.spawn.call(this, ent);
}

/**
 * ParseField
 */
function ParseField(ent, key, value) {
	var fi = fields[key];
	if (!fi) {
		return;
	}

	// Convert the value.
	var out;

	switch (fi.type) {
		case 'vector':
			// z seems to sometimes be optional...
			value.replace(/([^\s]+)\s+([^\s]+)\s*([^\s]*)/, function($0, x, y, z) {
				out = vec3.createFrom(
					parseFloat(x),
					parseFloat(y),
					z ? parseFloat(z) : 0
				);
			});
			break;
		case 'int':
			out = parseInt(value, 10);
			break;
		case 'float':
			out = parseFloat(value);
			break;
		case 'anglehack':
			out = vec3.createFrom(0, parseFloat(value), 0);
			break;
		default:
			out = value;
			break;
	}

	// Assign the value to the entity.
	var aliases = fi.aliases || [QS.FTA(key)];

	for (var i = 0; i < aliases.length; i++) {
		var alias = aliases[i];

		if (fi.type === 'vector' || fi.type === 'anglehack') {
			vec3.set(out, QS.AGET(ent, alias));
		} else {
			QS.ASET(ent, alias, out);
		}
	}
}

/**
 * SpawnString
 */
function SpawnString(key, defaultString) {
	if (typeof(level.spawnVars[key]) !== 'undefined') {
		return level.spawnVars[key];
	}

	return defaultString;
}

/**
 * SpawnFloat
 */
function SpawnFloat(key, defaultString) {
	var str = SpawnString(key, defaultString);
	return parseFloat(str);
}

/**
 * SpawnInt
 */
function SpawnInt(key, defaultString) {
	var str = SpawnString(key, defaultString);
	return parseInt(str, 10);
}

/**
 * SpawnVector
 */
function SpawnVector(key, defaultString) {
	var out = vec3.create();
	var str = SpawnString(key, defaultString);
	str.replace(/(.+) (.+) (.+)/, function($0, x, y, z) {
		out[0] = parseFloat(x);
		out[1] = parseFloat(x);
		out[2] = parseFloat(x);
	});
	return out;
}

/**
 * ChainTeams
 *
 * Chain together all entities with a matching team field.
 * Entity teams are used for item groups and multi-entity mover groups.
 *
 * All but the first will have the FL_TEAMSLAVE flag set and teammaster field set.
 * All but the last will have the teamchain field set to the next one.
 */
function ChainTeams() {
	var c = 0;
	var c2 = 0;

	for (var i = 1; i < MAX_GENTITIES; i++) {
		var e = level.gentities[i];

		if (!e.inuse) {
			continue;
		}

		if (e.s.arenaNum !== level.arena.arenaNum) {
			continue;
		}

		if (!e.team) {
			continue;
		}

		if (e.flags & GFL.TEAMSLAVE) {
			continue;
		}

		e.teammaster = e;
		c++;
		c2++;

		for (var j = i+1; j < MAX_GENTITIES; j++) {
			var e2 = level.gentities[j];
			if (!e2.inuse) {
				continue;
			}

			if (e2.s.arenaNum !== level.arena.arenaNum) {
				continue;
			}

			if (!e2.team) {
				continue;
			}

			if (e2.flags & GFL.TEAMSLAVE) {
				continue;
			}

			if (e.team === e2.team) {
				c2++;
				e2.teamchain = e.teamchain;
				e.teamchain = e2;
				e2.teammaster = e;
				e2.flags |= GFL.TEAMSLAVE;

				// Make sure that targets only point at the master.
				if (e2.targetName) {
					e.targetName = e2.targetName;
					e2.targetName = null;
				}
			}
		}
	}

	log(c + ' teams with ' + c2 + ' entities');
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

	e.s.eType = ET.EVENTS + event;
	e.classname = 'tempEntity';
	e.eventTime = level.time;
	e.freeAfterEvent = true;

	// vec3.set(origin, snapped);
	// SnapVector(snapped);  // save network bandwidth
	SetOrigin(e, origin);

	SV.LinkEntity(e);

	return e;
}

/**
 * FindEntity
 */
function FindEntity(criteria) {
	var results = [];

	for (var i = 0; i < level.gentities.length; i++) {
		var ent = level.gentities[i];

		if (!ent.inuse) {
			continue;
		}

		if (ent.s.arenaNum !== level.arena.arenaNum) {
			continue;
		}

		var valid = true;
		for (var key in criteria) {
			var value = criteria[key];

			if (ent[key] !== value) {
				valid = false;
				break;
			}
		}

		if (valid) {
			results.push(ent);
		}
	}

	return results;
}

/**
 * RunEntity
 */
function RunEntity(ent) {
	var thinktime = ent.nextthink;

	if (thinktime <= 0) {
		return;
	} else if (thinktime > level.time) {
		return;
	}

	ent.nextthink = 0;

	if (!ent.think) {
		error('null ent.think');
	}

	ent.think.call(this, ent);
}

/**
 * PickTarget
 */
function PickTarget(targetName) {
	if (!targetName) {
		log('PickTarget called with NULL targetname');
		return null;
	}

	var choices = FindEntity({ targetName: targetName });

	if (!choices.length) {
		log('PickTarget: target ' + targetName + ' not found');
		return null;
	}

	return choices[QMath.irrandom(0, choices.length - 1)];
}

/**
 * UseTargets
 *
 * "activator" should be set to the entity that initiated the firing.
 *
 * Search for (string)targetname in all entities that
 * match (string)self.target and call their .use function
 */
function UseTargets(ent, activator) {
	if (!ent) {
		return;
	}

	// if (ent.targetShaderName && ent.targetShaderNewName) {
	// 	float f = level.time * 0.001;
	// 	AddRemap(ent->targetShaderName, ent->targetShaderNewName, f);
	// 	trap_SetConfigstring(CS_SHADERSTATE, BuildShaderStateConfig());
	// }

	if (!ent.target) {
		return;
	}

	var targets = FindEntity({ targetName: ent.target });

	for (var i = 0; i < targets.length; i++) {
		var t = targets[i];

		if (t == ent) {
			log('WARNING: Entity used itself.');
		} else {
			if (t.use) {
				t.use(t, ent, activator);
			}
		}
		if (!ent.inuse) {
			log('Entity was removed while using targets.');
			return;
		}
	}
}

/**
 * SetOrigin
 *
 * Set the entities current origin as well as the entity's
 * associated trajectory information to make it stationary.
 */
function SetOrigin(ent, origin) {
	vec3.set(origin, ent.s.pos.trBase);
	ent.s.pos.trType = TR.STATIONARY;
	ent.s.pos.trTime = 0;
	ent.s.pos.trDuration = 0;
	ent.s.pos.trDelta[0] = ent.s.pos.trDelta[1] = ent.s.pos.trDelta[2] = 0;

	vec3.set(origin, ent.r.currentOrigin);
}

/**
 * SetMovedir
 *
 * The editor only specifies a single value for angles (yaw),
 * but we have special constants to generate an up or down direction.
 * Angles will be cleared, because it is being used to represent a direction
 * instead of an orientation.
 */
var VEC_UP       = vec3.createFrom(0, -1,  0);
var MOVEDIR_UP   = vec3.createFrom(0,  0,  1);
var VEC_DOWN     = vec3.createFrom(0, -2,  0);
var MOVEDIR_DOWN = vec3.createFrom(0,  0, -1);

function SetMovedir(angles, movedir) {
	if (vec3.equal(angles, VEC_UP)) {
		vec3.set(MOVEDIR_UP, movedir);
	} else if (vec3.equal(angles, VEC_DOWN)) {
		vec3.set(MOVEDIR_DOWN, movedir);
	} else {
		QMath.AnglesToVectors(angles, movedir, null, null);
	}
	angles[0] = angles[1] = angles[2] = 0;
}

/**
 * AddEvent
 *
 * Adds an event+parm and twiddles the event counter
 */
function AddEvent(ent, event, eventParm) {
	var bits;

	if (!event) {
		log('AddEvent: zero event added for entity', ent.s.number);
		return;
	}

	// Clients need to add the event in PlayerState instead of EntityState.
	if (ent.client) {
		bits = ent.client.ps.externalEvent & EV_EVENT_BITS;
		bits = (bits + EV_EVENT_BIT1) & EV_EVENT_BITS;
		ent.client.ps.externalEvent = event | bits;
		ent.client.ps.externalEventParm = eventParm;
	} else {
		bits = ent.s.event & EV_EVENT_BITS;
		bits = (bits + EV_EVENT_BIT1) & EV_EVENT_BITS;
		ent.s.event = event | bits;
		ent.s.eventParm = eventParm;
	}

	ent.eventTime = level.time;
}

/**
 * AddPredictableEvent
 *
 * Use for non-pmove events that would also be predicted on the
 * client side: jumppads and item pickups
 * Adds an event + parm and twiddles the event counter
 */
function AddPredictableEvent(ent, event, eventParm) {
	if (!ent.client) {
		return;
	}

	BG.AddPredictableEventToPlayerstate(ent.client.ps, event, eventParm);
}

/**
 * AddSound
 */
function AddSound(ent, /*channel,*/ soundIndex) {
	var te = TempEntity(ent.r.currentOrigin, EV.GENERAL_SOUND);
	te.s.eventParm = soundIndex;
}
