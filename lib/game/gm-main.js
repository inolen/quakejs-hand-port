var com;
var sv;

var level;

var g_gravity;

/**
 * log
 */
function log() {
	var args = Array.prototype.slice.call(arguments);
	args.splice(0, 0, 'GM:');
	Function.apply.call(console.log, console, args);
}

/**
 * error
 */
function error(str) {
	com.error(Err.DROP, str);
}

/**
 * Init
 */
function Init(cominterface, svinterface, levelTime) {
	log('Initializing');
	
	com = cominterface;
	sv = svinterface;

	level = new LevelLocals();
	level.time = levelTime;
	level.startTime = levelTime;

	g_gravity = com.AddCvar('g_gravity', 800);

	// Let the server system know where the entites are.
	sv.LocateGameData(level.gentities, level.clients);

	// Spawn all the entities for the current level.
	SpawnAllEntitiesFromDefs();
}

/**
 * Shutdown
 */
function Shutdown() {
}

/**
 * Frame
 */
function Frame(levelTime) {
	level.framenum++;
	level.previousTime = level.time;
	level.time = levelTime;

	for (var i = 0; i < MAX_GENTITIES; i++) {
		var ent = level.gentities[i];
		if (!ent.inuse) {
			continue;
		}

		// Clear events that are too old.
		if (level.time - ent.eventTime > EVENT_VALID_MSEC) {
			if (ent.s.event) {
				ent.s.event = 0;  // &= EV_EVENT_BITS;
				if (ent.client) {
					ent.client.ps.externalEvent = 0;
				}
			}
			
			if (ent.freeAfterEvent) {
				// tempEntities or dropped items completely go away after their event.
				FreeEntity(ent);
				continue;
			}
			// else if (ent->unlinkAfterEvent) {
			// 	// items that will respawn will hide themselves after their pickup event
			// 	ent->unlinkAfterEvent = qfalse;
			// 	trap_UnlinkEntity( ent );
			// }
		}

		// Temporary entities don't think.
		if (ent.freeAfterEvent) {
			continue;
		}
		
		/*if (i < MAX_CLIENTS) {
			ClientThink(ent.client.number);
			continue;
		}*/

		EntityThink(ent);
	}
}