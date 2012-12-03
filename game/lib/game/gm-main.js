var level;

var g_gametype,
	g_dmflags,
	g_fraglimit,
	g_timelimit,
	g_capturelimit,
	g_maxclients,
	g_maxGameClients,
	g_synchronousClients,
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
	
	// latched vars
	g_gametype           = com.AddCvar('g_gametype',           0,     CVF.SERVERINFO | CVF.USERINFO | CVF.LATCH);
	
	g_maxclients         = com.AddCvar('sv_maxclients',        8,     CVF.SERVERINFO | CVF.LATCH | CVF.ARCHIVE);
	g_maxGameClients     = com.AddCvar('g_maxGameClients',     0,     CVF.SERVERINFO | CVF.LATCH | CVF.ARCHIVE);
	
	// change anytime vars
	g_dmflags            = com.AddCvar('dmflags',            0,     CVF.SERVERINFO | CVF.ARCHIVE);
	g_fraglimit          = com.AddCvar('fraglimit',          20,    CVF.SERVERINFO | CVF.ARCHIVE | CVF.NORESTART);
	g_timelimit          = com.AddCvar('timelimit',          0,     CVF.SERVERINFO | CVF.ARCHIVE | CVF.NORESTART);
	g_capturelimit       = com.AddCvar('capturelimit',       8,     CVF.SERVERINFO | CVF.ARCHIVE | CVF.NORESTART);
	
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
	
	// Load session info.
	InitWorldSession();

	// Let the server system know where the entites are.
	sv.LocateGameData(level.gentities, level.clients);

	// Spawn all the entities for the current level.
	SpawnAllEntitiesFromDefs();
}

/**
 * Shutdown
 */
function Shutdown() {
	// Write all the client session data so we can get it back.
	WriteSessionData();
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
	
	// see if it is time to end the level
	CheckExitRules();
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
function FindIntermissionPoint() {
	var ent;
	var target;
	var dir = [0, 0, 0];
	
	var points = FindEntity('classname', 'info_player_intermission');

	var point;
	if (!points.length) {
		point = SelectSpawnPoint(QMath.vec3_origin, level.intermissionOrigin, level.intermissionAngles);
	} else {
		point = points[0];

		vec3.set(point.s.origin, level.intermissionOrigin);
		vec3.set(point.s.angles, level.intermissionAngles);

		// If it has a target, look towards it.
		if (point.target) {
			var target = PickTarget(point.target);

			if (target) {
				var dir = vec3.subtract(target.s.origin, level.intermissionOrigin, [0, 0, 0]);
				QMath.VectorToAngles(dir, level.intermissionAngles)
			}
		}
	}
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
function ExitLevel () {
	var cl;
// 	char nextmap[MAX_STRING_CHARS];
// 	char d1[MAX_STRING_CHARS];

// 	//bot interbreeding
// 	BotInterbreedEndMatch();

	// if we are running a tournement map, kick the loser to spectator status,
	// which will automatically grab the next spectator and restart
	if (g_gametype() == GT.TOURNAMENT ) {
		if (!level.restarted) {
// 			RemoveTournamentLoser();
// 			trap_SendConsoleCommand( EXEC_APPEND, "map_restart 0\n" );
			level.restarted = true;
			level.changemap = null;
			level.intermissiontime = 0;
		}
		return;	
	}

// 	trap_Cvar_VariableStringBuffer( "nextmap", nextmap, sizeof(nextmap) );
// 	trap_Cvar_VariableStringBuffer( "d1", d1, sizeof(d1) );
// 
// 	if( !Q_stricmp( nextmap, "map_restart 0" ) && Q_stricmp( d1, "" ) ) {
// 		trap_Cvar_Set( "nextmap", "vstr d2" );
// 		trap_SendConsoleCommand( EXEC_APPEND, "vstr d1\n" );
// 	} else {
// 		trap_SendConsoleCommand( EXEC_APPEND, "vstr nextmap\n" );
// 	}

	level.changemap = null;
	level.intermissiontime = 0;

	// reset all the scores so we don't enter the intermission again
	level.teamScores[TEAM.RED] = 0;
	level.teamScores[TEAM.BLUE] = 0;
	
	for (var i = 0; i < g_maxclients(); i++) {
		cl = level.clients[i];
		
		if (cl.pers.connected != CON.CONNECTED) {
			continue;
		}
		
		cl.ps.persistant[PERS.SCORE] = 0;
	}

	// we need to do this here before changing to CON_CONNECTING
// 	G_WriteSessionData();

	// change all client states to connecting, so the early players into the
	// next level will know the others aren't done reconnecting
	for (var i = 0; i < g_maxclients(); i++) {
		if (level.clients[i].pers.connected == CON.CONNECTED) {
			level.clients[i].pers.connected = CON.CONNECTING;
		}
	}
}

/**
 * LogExit
 * 
 * Append information about this game to the log file
 */
function LogExit( str ) {
	var numSorted;
	var cl;
	
// 	G_LogPrintf( "Exit: %s\n", str );
	
	
	// RD: Why the hell is this in the LogExit function? o.o
	level.intermissionQueued = level.time;
	
	
	// this will keep the clients from playing any voice sounds
	// that will get cut off when the queued intermission starts
// 	trap_SetConfigstring( CS_INTERMISSION, "1" );
	
	// don't send more than 32 scores (FIXME?)
// 	numSorted = level.numConnectedClients;
// 	if (numSorted > 32) {
// 		numSorted = 32;
// 	}
// 	
// 	if (g_gametype() >= GT.TEAM) {
// 		G_LogPrintf( "red:%i  blue:%i\n", level.teamScores[TEAM_RED], level.teamScores[TEAM_BLUE] );
// 	}
// 	
// 	for (var i = 0; i < numSorted; i++) {
// 		var ping;
// 		
// 		cl = level.clients[level.sortedClients[i]];
// 		
// 		if (cl.sess.sessionTeam == TEAM.SPECTATOR) {
// 			continue;
// 		}
// 		
// 		if (cl.pers.connected == CON.CONNECTING) {
// 			continue;
// 		}
// 		
// 		ping = cl.ps.ping < 999 ? cl.ps.ping : 999;
// 		
// 		G_LogPrintf( "score: %i  ping: %i  client: %i %s\n", cl->ps.persistant[PERS_SCORE], ping, level.sortedClients[i],	cl->pers.netname );
// 	}
}

/**
 * CheckIntermissionExit
 * 
 * The level will stay at the intermission for a minimum of 5 seconds
 * If all players wish to continue, the level will then exit.
 * If one or more players have not acknowledged the continue, the game will
 * wait 10 seconds before going on.
 */
function CheckIntermissionExit () {
	var ready, notReady, playerCount;
	var cl;
	var readyMask;
	
	if ( g_gametype() == GT.SINGLE_PLAYER ) {
		return;
	}
	
	// see which players are ready
	ready = 0;
	notReady = 0;
	readyMask = 0;
	playerCount = 0;
	for (var i = 0; i < g_maxclients(); i++) {
		cl = level.clients[i];
		if (cl.pers.connected != CON.CONNECTED) {
			continue;
		}
		
		if ( g_entities[cl.ps.clientNum].r.svFlags & SVF_BOT ) {
			continue;
		}
		
		playerCount++;
		
		if (cl.readyToExit) {
			ready++;
			
			if (i < 16) {
				readyMask |= 1 << i;
			}
		} else {
			notReady++;
		}
	}
	
	// copy the readyMask to each player's stats so
	// it can be displayed on the scoreboard
	for (var i = 0; i < g_maxclients(); i++) {
		cl = level.clients[i];
		if (cl.pers.connected != CON.CONNECTED) {
			continue;
		}
		
		cl.ps.stats[STAT.CLIENTS_READY] = readyMask;
	}
	
	// never exit in less than five seconds
	if (level.time < level.intermissiontime + 5000) {
		return;
	}

	// only test ready status when there are real players present
	if (playerCount > 0) {
		// if nobody wants to go, clear timer
		if (!ready) {
			level.readyToExit = false;
			return;
		}
		
		// if everyone wants to go, go now
		if (!notReady) {
			ExitLevel();
			return;
		}
	}
	
	// the first person to ready starts the ten second timeout
	if (!level.readyToExit) {
		level.readyToExit = true;
		level.exitTime = level.time;
	}
	
	// if we have waited ten seconds since at least one player
	// wanted to exit, go ahead
	if (level.time < level.exitTime + 10000) {
		return;
	}
	
	ExitLevel();
}

/**
 * ScoreIsTied
 */
function ScoreIsTied () {
	var a, b;
	
	if (level.numPlayingClients < 2) {
		return false;
	}
	
	if (g_gametype() >= GT.TEAM) {
		return level.teamScores[TEAM.RED] == level.teamScores[TEAM.BLUE];
	}
	
	a = level.clients[level.sortedClients[0]].ps.persistant[PERS.SCORE];
	b = level.clients[level.sortedClients[1]].ps.persistant[PERS.SCORE];
	
	return (a == b);
}

/**
 * CheckExitRules
 * 
 * There will be a delay between the time the exit is qualified for
 * and the time everyone is moved to the intermission spot, so you
 * can see the last frag.
 */
function CheckExitRules () {
	var cl;
	
	// if at the intermission, wait for all non-bots to
	// signal ready, then go to next level
	if (level.intermissiontime) {
		CheckIntermissionExit();
		return;
	}
	
	if (level.intermissionQueued) {
		if (level.time - level.intermissionQueued >= INTERMISSION_DELAY_TIME) {
			level.intermissionQueued = 0;
			BeginIntermission();
		}
		
		return;
	}
	
	// check for sudden death
	if (ScoreIsTied()) {
		// always wait for sudden death
		return;
	}
	
	if (g_timelimit() && !level.warmupTime) {
		if (level.time - level.startTime >= g_timelimit() * 60000) {
// 			trap_SendServerCommand( -1, "print \"Timelimit hit.\n\"");
// 			LogExit( "Timelimit hit." );
			return;
		}
	}
	
	if (g_gametype() < GT.CTF && g_fraglimit()) {
		if (level.teamScores[TEAM.RED] >= g_fraglimit()) {
// 			trap_SendServerCommand( -1, "print \"Red hit the fraglimit.\n\"" );
// 			LogExit( "Fraglimit hit." );
			return;
		}
		
		if (level.teamScores[TEAM.BLUE] >= g_fraglimit()) {
// 			trap_SendServerCommand( -1, "print \"Blue hit the fraglimit.\n\"" );
// 			LogExit( "Fraglimit hit." );
			return;
		}
		
		for (var i = 0; i < g_maxclients(); i++) {
			if (!level.clients[i]) { continue; }
			
			cl = level.clients[i];
			
			if ( cl.pers.connected != CON.CONNECTED ) {
				continue;
			}
			
			if ( cl.sess.sessionTeam != TEAM.FREE ) {
				continue;
			}
			
			if (cl.ps.persistant[PERS_SCORE] >= g_fraglimit()) {
// 				LogExit( "Fraglimit hit." );
// 				trap_SendServerCommand( -1, va("print \"%s" S_COLOR_WHITE " hit the fraglimit.\n\"", cl->pers.netname ) );
				return;
			}
		}
	}
	
	if (g_gametype() >= GT.CTF && g_capturelimit()) {
		if (level.teamScores[TEAM.RED] >= g_capturelimit()) {
// 			trap_SendServerCommand( -1, "print \"Red hit the capturelimit.\n\"" );
// 			LogExit( "Capturelimit hit." );
			return;
		}
		
		if (level.teamScores[TEAM.BLUE] >= g_capturelimit()) {
// 			trap_SendServerCommand( -1, "print \"Blue hit the capturelimit.\n\"" );
// 			LogExit( "Capturelimit hit." );
			return;
		}
	}
}
