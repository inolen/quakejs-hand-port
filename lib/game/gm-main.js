var level;

var g_gametype,
	g_fraglimit,
	g_timelimit,
	g_capturelimit,
	g_synchronousClients,
	pmove_fixed,
	pmove_msec,
	g_teamAutoJoin,
	g_teamForceBalance,
	g_friendlyFire,
	g_playersPerTeam,
	g_teamForceBalance,
	g_warmup,
	g_speed,
	g_gravity,
	g_knockback,
	g_quadfactor,
	g_weaponRespawn,
	g_weaponTeamRespawn,
	g_forceRespawn,
	g_inactivity;

/**
 * log
 */
function log() {
	SV.Log.apply(this, arguments);
}

/**
 * error
 */
function error(str) {
	SV.Error(str);
}

/**
 * Init
 */
function Init(levelTime) {
	log('Initializing GM');

	level = new GameLocals();
	level.time = levelTime;
	level.startTime = levelTime;

	RegisterCvars();

	// Load session info.
	InitWorldSession();

	// Initialize all clients for this game.
	var sv_maxClients = Cvar.GetCvar('sv_maxClients');
	level.maxclients = sv_maxClients.get();

	// Let the server system know where the entites are.
	SV.LocateGameData(level.gentities, level.clients);

	// Reserve some spots for dead player bodies.
	InitBodyQueue();

	// Initialize sub-arenas and spawn their entities.
	InitArenas();
}

/**
 * RegisterCvars
 */
function RegisterCvars() {
	g_timelimit          = Cvar.AddCvar('g_timelimit',          0,     Cvar.FLAGS.SERVERINFO | Cvar.FLAGS.ARCHIVE);
	g_fraglimit          = Cvar.AddCvar('g_fraglimit',          20,    Cvar.FLAGS.SERVERINFO | Cvar.FLAGS.ARCHIVE);
	g_capturelimit       = Cvar.AddCvar('g_capturelimit',       8,     Cvar.FLAGS.SERVERINFO | Cvar.FLAGS.ARCHIVE);

	g_gametype           = Cvar.AddCvar('g_gametype',           0,     Cvar.FLAGS.ARENAINFO | Cvar.FLAGS.ARCHIVE, true);
	g_playersPerTeam     = Cvar.AddCvar('g_playersPerTeam',     0,     Cvar.FLAGS.ARENAINFO | Cvar.FLAGS.ARCHIVE);

	g_synchronousClients = Cvar.AddCvar('g_synchronousClients', 0,     Cvar.FLAGS.SYSTEMINFO);
	pmove_fixed          = Cvar.AddCvar('pmove_fixed',          1,     Cvar.FLAGS.SYSTEMINFO);
	pmove_msec           = Cvar.AddCvar('pmove_msec',           8,     Cvar.FLAGS.SYSTEMINFO);

	g_teamAutoJoin       = Cvar.AddCvar('g_teamAutoJoin',       0,     Cvar.FLAGS.ARCHIVE);
	g_teamForceBalance   = Cvar.AddCvar('g_teamForceBalance',   0,     Cvar.FLAGS.ARCHIVE);
	g_friendlyFire       = Cvar.AddCvar('g_friendlyFire',       0,     Cvar.FLAGS.ARCHIVE);
	g_teamForceBalance   = Cvar.AddCvar('g_teamForceBalance',   0,     Cvar.FLAGS.ARCHIVE);
	g_warmup             = Cvar.AddCvar('g_warmup',             10,    Cvar.FLAGS.ARCHIVE);

	g_speed              = Cvar.AddCvar('g_speed',              320);
	g_gravity            = Cvar.AddCvar('g_gravity',            800);
	g_knockback          = Cvar.AddCvar('g_knockback',          1000);
	g_quadfactor         = Cvar.AddCvar('g_quadfactor',         3);
	g_weaponRespawn      = Cvar.AddCvar('g_weaponrespawn',      5);
	g_weaponTeamRespawn  = Cvar.AddCvar('g_weaponTeamRespawn',  30);
	g_forceRespawn       = Cvar.AddCvar('g_forceRespawn',       20);
	g_inactivity         = Cvar.AddCvar('g_inactivity',         0);
}

/**
 * Shutdown
 */
function Shutdown() {
	log('Shutdown GM');

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

		// Set current arena for entity spawning purposes.
		level.arena = level.arenas[ent.s.arenaNum];

		// Clear events that are too old.
		if (level.time - ent.eventTime > EVENT_VALID_MSEC) {
			if (ent.s.event) {
				ent.s.event = 0;

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
				SV.UnlinkEntity(ent);
			}
		}

		// Temporary entities don't think.
		if (ent.freeAfterEvent) {
			continue;
		}

		if (!ent.r.linked && ent.neverFree) {
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

	RunArenas();
}

/**
 * FindEntitiesInBox
 */
function FindEntitiesInBox(mins, maxs) {
	return SV.FindEntitiesInBox(mins, maxs, level.arena.arenaNum);
}

/**
 * Trace
 */
function Trace(results, start, end, mins, maxs, passEntityNum, contentmask) {
	return SV.Trace(results, start, end, mins, maxs, level.arena.arenaNum, passEntityNum, contentmask);
}

/**
 * PointContents
 */
function PointContents(point, passEntityNum) {
	return SV.PointContents(point, level.arena.arenaNum, passEntityNum);
}

/**
 * BGExports
 */
function BGExports() {
	return {
		error: error
	};
}