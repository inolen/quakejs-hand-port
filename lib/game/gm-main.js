var level;

var TEAM_SIZE = 1;

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
	com.Error(str);
}

/**
 * Init
 */
function Init(levelTime) {
	log('Initializing');

	level = new GameLocals();
	level.time = levelTime;
	level.startTime = levelTime;

	RegisterCvars();

	// Load session info.
	InitWorldSession();

	// Initialize all clients for this game.
	level.maxclients = com.GetCvarVal('sv_maxClients');

	// Let the server system know where the entites are.
	sv.LocateGameData(level.gentities, level.clients);

	// Reserve some spots for dead player bodies.
	InitBodyQueue();

	// Spawn all the entities for the current level.
	SpawnAllEntitiesFromDefs();

	// Make sure we have flags for CTF, etc.
	if (g_gametype() >= GT.TEAM) {
		Team_CheckItems();
	}

	InitArenas();
}

/**
 * Shutdown
 */
function Shutdown() {
	// Write all the client session data so we can get it back.
	WriteWorldSession();
}

/**
 * Frame
 */
function Frame(levelTime) {
	// If we are waiting for the level to restart, do nothing.
	if (level.restarted) {
		console.log('level restarted ignoring');
		return;
	}

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
			else if (ent.unlinkAfterEvent) {
				// items that will respawn will hide themselves after their pickup event
				ent.unlinkAfterEvent = false;
				sv.UnlinkEntity(ent);
			}
		}

		// Temporary entities don't think.
		if (ent.freeAfterEvent) {
			continue;
		}

		if (!ent.linked && ent.neverFree) {
			continue;
		}

		if (ent.s.eType === ET.MISSILE) {
			RunMissile(ent);
			continue;
		}

		if (ent.s.eType === ET.ITEM || ent.physicsObject) {
			RunItem(ent);
			continue;
		}

		if (ent.s.eType === ET.MOVER) {
			RunMover(ent);
			continue;
		}

		if (i < level.maxclients) {
			RunClient(ent);
			continue;
		}

		RunEntity(ent);
	}

	// Perform final fixups on the players.
	for (var i = 0; i < level.maxclients; i++) {
		var ent = level.gentities[i];
		if (ent.inuse) {
			ClientEndFrame(ent);
		}
	}

	for (var i = 0; i < level.arenas.length; i++) {
		CheckArenaRules(level.arenas[i]);
	}
}

/**
 * BGExports
 */
function BGExports() {
	return {
		com: {
			ERR:   com.ERR,
			Error: com.Error
		}
	};
}