var level;

var g_synchronousClients,
	g_speed,
	g_gravity,
	g_knockback,
	g_quadfactor,
	g_weaponRespawn,
	g_weaponTeamRespawn,
	g_forcerespawn,
	g_inactivity,
	g_debugMove,
	g_debugDamage,
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
	com.error(ERR.DROP, str);
}

/**
 * Init
 */
function Init(levelTime) {
	log('Initializing');

	level = new LevelLocals();
	level.time = levelTime;
	level.startTime = levelTime;
	
	g_synchronousClients = com.AddCvar('g_synchronousClients', 0,     CVF.SYSTEMINFO)
	g_speed              = com.AddCvar('g_speed',              320);
	g_gravity            = com.AddCvar('g_gravity',            800);
	g_knockback          = com.AddCvar('g_knockback',          1000);
	g_quadfactor         = com.AddCvar('g_quadfactor',         3);
	g_weaponRespawn      = com.AddCvar('g_weaponrespawn',      5);
	g_weaponTeamRespawn  = com.AddCvar('g_weaponTeamRespawn',  30);
	g_forcerespawn       = com.AddCvar('g_forcerespawn',       20);
	g_inactivity         = com.AddCvar('g_inactivity',         0);
	g_debugMove          = com.AddCvar('g_debugMove',          0);
	g_debugDamage        = com.AddCvar('g_debugDamage',        0);
	g_motd               = com.AddCvar('g_motd',               "");
	g_blood              = com.AddCvar('g_blood',              1);
	
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

		if (ent.s.eType == ET.MISSILE) {
			RunMissile(ent);
			continue;
		}
		
		if (i < MAX_CLIENTS) {
			RunClient(ent);
			continue;
		}

		RunEntity(ent);
	}

	// Perform final fixups on the players.
	for (var i = 0; i < MAX_CLIENTS; i++) {
		var ent = level.gentities[i];
		if (ent.inuse) {
			ClientEndFrame(ent);
		}
	}
}

/**********************************************************
 *
 * Map Changing
 *
 **********************************************************/

/**
 * SendScoreboardMessageToAllClients
 *
 * Do this at BeginIntermission time and whenever ranks are recalculated
 * due to enters/exits/forced team changes
 */
function SendScoreboardMessageToAllClients () {
	var i;

// 	for (var i = 0; i < level.maxclients; i++) {
// 		if (level.clients[i].pers.connected == CON_CONNECTED) {
// 			DeathmatchScoreboardMessage(g_entities() + i);
// 		}
// 	}
}

/**
 * MoveClientToIntermission
 *
 * When the intermission starts, this will be called for all players.
 * If a new client connects, this will be called after the spawn function.
 */
function MoveClientToIntermission (ent) {
	// take out of follow mode if needed
	if (ent.client.sess.spectatorState == SPECTATOR.FOLLOW) {
		StopFollowing(ent);
	}
	
// 	FindIntermissionPoint();
	// move to the spot
// 	VectorCopy(level.intermission_origin, ent.s.origin);
// 	VectorCopy(level.intermission_origin, ent.client.ps.origin);
// 	VectorCopy(level.intermission_angle, ent.client.ps.viewangles);
	ent.client.ps.pm_type = PM.INTERMISSION;
	
	// clean up powerup info
// 	memset(ent.client.ps.powerups, 0, ent.client.ps.powerups.length);
	
	ent.client.ps.eFlags = 0;
	ent.s.eFlags = 0;
	ent.s.eType = ET.GENERAL;
	ent.s.modelindex = 0;
	ent.s.loopSound = 0;
	ent.s.event = 0;
	ent.r.contents = 0;
}

/**
 * FindIntermissionPoint
 * 
 * This is also used for spectator spawns
 */
function FindIntermissionPoint () {
	var ent;
	var target;
	var dir = [0, 0, 0];
	
	// find the intermission spot
// 	ent = G_Find (null, FOFS(classname), "info_player_intermission");
// 	if (!ent) {	// the map creator forgot to put in an intermission point...
// 		SelectSpawnPoint(vec3_origin, level.intermission_origin, level.intermission_angle, false);
// 	} else {
// 		VectorCopy (ent.s.origin, level.intermission_origin);
// 		VectorCopy (ent.s.angles, level.intermission_angle);
// 		// if it has a target, look towards it
// 		if ( ent.target ) {
// 			target = G_PickTarget( ent.target );
// 			if ( target ) {
// 				VectorSubtract( target.s.origin, level.intermission_origin, dir );
// 				vectoangles( dir, level.intermission_angle );
// 			}
// 		}
// 	}
}

/**
 * BeginIntermission
 */
function BeginIntermission () {
	var client;
	
	if (level.intermissiontime) {
		return;		// already active
	}
	
	// if in tournement mode, change the wins / losses
// 	if ( g_gametype() == GT.TOURNAMENT ) {
// 		AdjustTournamentScores();
// 	}
	
	level.intermissiontime = level.time;
	// move all clients to the intermission point
	for (var i = 0; i < level.maxclients; i++) {
		client = g_entities() + i;
		if (!client.inuse) {
			continue;
		}
		// respawn if dead
		if (client.health <= 0) {
			ClientRespawn(client);
		}
		
		MoveClientToIntermission(client);
	}
	
	// if single player game
	if (g_gametype() == GT.SINGLE_PLAYER) {
		UpdateTournamentInfo();
		SpawnModelsOnVictoryPads();
	}
	
	// send the current scoring to all clients
	SendScoreboardMessageToAllClients();
}


/*
 * ExitLevel
 * 
 * When the intermission has been exited, the server is either killed
 * or moved to a new level based on the "nextmap" cvar 
 */
void ExitLevel (void) {
	int		i;
	gclient_t *cl;
	char nextmap[MAX_STRING_CHARS];
	char d1[MAX_STRING_CHARS];

	//bot interbreeding
	BotInterbreedEndMatch();

	// if we are running a tournement map, kick the loser to spectator status,
	// which will automatically grab the next spectator and restart
	if ( g_gametype.integer == GT_TOURNAMENT  ) {
		if ( !level.restarted ) {
			RemoveTournamentLoser();
			trap_SendConsoleCommand( EXEC_APPEND, "map_restart 0\n" );
			level.restarted = qtrue;
			level.changemap = NULL;
			level.intermissiontime = 0;
		}
		return;	
	}

	trap_Cvar_VariableStringBuffer( "nextmap", nextmap, sizeof(nextmap) );
	trap_Cvar_VariableStringBuffer( "d1", d1, sizeof(d1) );

	if( !Q_stricmp( nextmap, "map_restart 0" ) && Q_stricmp( d1, "" ) ) {
		trap_Cvar_Set( "nextmap", "vstr d2" );
		trap_SendConsoleCommand( EXEC_APPEND, "vstr d1\n" );
	} else {
		trap_SendConsoleCommand( EXEC_APPEND, "vstr nextmap\n" );
	}

	level.changemap = NULL;
	level.intermissiontime = 0;

	// reset all the scores so we don't enter the intermission again
	level.teamScores[TEAM_RED] = 0;
	level.teamScores[TEAM_BLUE] = 0;
	for ( i=0 ; i< g_maxclients.integer ; i++ ) {
		cl = level.clients + i;
		if ( cl->pers.connected != CON_CONNECTED ) {
			continue;
		}
		cl->ps.persistant[PERS_SCORE] = 0;
	}

	// we need to do this here before changing to CON_CONNECTING
	G_WriteSessionData();

	// change all client states to connecting, so the early players into the
	// next level will know the others aren't done reconnecting
	for (i=0 ; i< g_maxclients.integer ; i++) {
		if ( level.clients[i].pers.connected == CON_CONNECTED ) {
			level.clients[i].pers.connected = CON_CONNECTING;
		}
	}

}
