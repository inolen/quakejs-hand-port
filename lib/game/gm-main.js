var level;

var g_speed,
	g_gravity,
	g_knockback,
	g_quadfactor,
	g_weaponRespawn,
	g_weaponTeamRespawn,
	g_forcerespawn,
	g_inactivity,
	g_debugMove,
	g_debugDamage,
	g_debugAlloc,
	g_motd,
	g_blood;

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
	com.error(sh.Err.DROP, str);
}

/**
 * Init
 */
function Init(levelTime) {
	log('Initializing');

	level = new LevelLocals();
	level.time = levelTime;
	level.startTime = levelTime;
	
	g_speed             = com.AddCvar('g_speed',             320);
	g_gravity           = com.AddCvar('g_gravity',           800);
	g_knockback         = com.AddCvar('g_knockback',         1000);
	g_quadfactor        = com.AddCvar('g_quadfactor',        3);
	g_weaponRespawn     = com.AddCvar('g_weaponrespawn',     5);
	g_weaponTeamRespawn = com.AddCvar('g_weaponTeamRespawn', 30);
	g_forcerespawn      = com.AddCvar('g_forcerespawn',      20);
	g_inactivity        = com.AddCvar('g_inactivity',        0);
	g_debugMove         = com.AddCvar('g_debugMove',         0);
	g_debugDamage       = com.AddCvar('g_debugDamage',       0);
	g_debugAlloc        = com.AddCvar('g_debugAlloc',        0);
	g_motd              = com.AddCvar('g_motd',              "");
	g_blood             = com.AddCvar('g_blood',             1);
	
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
		
		/*if (i < MAX_CLIENTS) {
			ClientThink(ent.client.number);
			continue;
		}*/

		if (ent.s.eType == ET.MISSILE) {
			MissileThink(ent);
			continue;
		}

		EntityThink(ent);
	}
}
