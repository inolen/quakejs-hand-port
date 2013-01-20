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
		TeamCheckItems();
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

	// See if it is time to end the level.
	CheckExitRules();
}

/**
 * CheckExitRules
 *
 * There will be a delay between the time the exit is qualified for
 * and the time everyone is moved to the intermission spot, so you
 * can see the last frag.
 */
function CheckExitRules() {
	// If at the intermission, wait for all non-bots to
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

	// Check for sudden death.
	// if (ScoreIsTied()) {
	// 	// Always wait for sudden death.
	// 	return;
	// }

	// if (g_timelimit() && level.warmupTime === WARMUP_OVER) {
	// 	if (level.time - level.startTime >= g_timelimit() * 60000) {
	// 		sv.SendServerCommand(null, 'print', 'Timelimit hit.');
	// 		LogExit('Timelimit hit.');
	// 		return;
	// 	}
	// }

	// if (g_gametype() < GT.CTF && g_fraglimit()) {
	// 	if (level.teamScores[TEAM.RED] >= g_fraglimit()) {
	// 		sv.SendServerCommand(null, 'print', 'Red hit the fraglimit.');
	// 		LogExit('Fraglimit hit.');
	// 		return;
	// 	}

	// 	if (level.teamScores[TEAM.BLUE] >= g_fraglimit()) {
	// 		sv.SendServerCommand(null, 'print', 'Blue hit the fraglimit.');
	// 		LogExit('Fraglimit hit.');
	// 		return;
	// 	}

	// 	for (var i = 0; i < level.maxclients; i++) {
	// 		var client = level.clients[i];

	// 		if (client.pers.connected !== CON.CONNECTED) {
	// 			continue;
	// 		}

	// 		if (client.sess.sessionTeam !== TEAM.FREE) {
	// 			continue;
	// 		}

	// 		if (client.ps.persistant[PERS.SCORE] >= g_fraglimit()) {
	// 			sv.SendServerCommand(null, client.pers.netname + ' hit the fraglimit.');
	// 			LogExit('Fraglimit hit.');
	// 			return;
	// 		}
	// 	}
	// }

	// if (g_gametype() >= GT.CTF && g_gametype() !== GT.CLANARENA && g_capturelimit()) {
	// 	if (level.teamScores[TEAM.RED] >= g_capturelimit()) {
	// 		sv.SendServerCommand(null, 'print', 'Red hit the capturelimit.');
	// 		LogExit('Capturelimit hit.');
	// 		return;
	// 	}

	// 	if (level.teamScores[TEAM.BLUE] >= g_capturelimit()) {
	// 		sv.SendServerCommand(null, 'print', 'Blue hit the capturelimit.');
	// 		LogExit('Capturelimit hit.');
	// 		return;
	// 	}
	// }
}

/**
 * CheckIntermissionExit
 *
 * The level will stay at the intermission for a minimum of 5 seconds
 * If all players wish to continue, the level will then exit.
 * If one or more players have not acknowledged the continue, the game will
 * wait 10 seconds before going on.
 */
function CheckIntermissionExit() {
	// See which players are ready.
	var ready = 0;
	var notReady = 0;
	var readyMask = 0;
	var playerCount = 0;

	for (var i = 0; i < level.maxclients; i++) {
		var client = level.clients[i];
		if (client.pers.connected !== CON.CONNECTED) {
			continue;
		}

		if (level.gentities[client.ps.clientNum].svFlags & SVF.BOT) {
			continue;
		}

		playerCount++;

		if (client.readyToExit) {
			ready++;

			if (i < 16) {
				readyMask |= 1 << i;
			}
		} else {
			notReady++;
		}
	}

	// Copy the readyMask to each player's stats so
	// it can be displayed on the scoreboard
	for (var i = 0; i < level.maxclients; i++) {
		var client = level.clients[i];
		if (client.pers.connected !== CON.CONNECTED) {
			continue;
		}

		client.ps.stats[STAT.CLIENTS_READY] = readyMask;
	}

	// Never exit in less than five seconds.
	if (level.time < level.intermissiontime + 5000) {
		return;
	}

	// Only test ready status when there are real players present.
	if (playerCount > 0) {
		// If nobody wants to go, clear timer.
		if (!ready) {
			level.readyToExit = false;
			return;
		}

		// If everyone wants to go, go now.
		if (!notReady) {
			ExitLevel();
			return;
		}
	}

	// The first person to ready starts the ten second timeout.
	if (!level.readyToExit) {
		level.readyToExit = true;
		level.exitTime = level.time;
	}

	// If we have waited ten seconds since at least one player
	// wanted to exit, go ahead.
	if (level.time < level.exitTime + 10000) {
		return;
	}

	ExitLevel();
}

/**
 * BeginIntermission
 */
function BeginIntermission() {
	if (level.intermissiontime) {
		return;  // already active
	}

	// If in tournement mode, change the wins / losses.
	if (g_gametype() === GT.TOURNAMENT) {
		AdjustTournamentScores();
	}

	level.intermissiontime = level.time;

	// Move all clients to the intermission point.
	for (var i = 0; i < level.maxclients; i++) {
		var ent = level.gentities[i];
		if (!ent.inuse) {
			continue;
		}

		// Respawn if dead.
		if (ent.health <= 0) {
			ClientRespawn(ent);
		}

		MoveClientToIntermission(ent);
	}

	// Send the current scoring to all clients.
	SendScoreboardMessageToAllClients();
}

/**
 * SendScoreboardMessageToAllClients
 *
 * Do this at BeginIntermission time and whenever ranks are recalculated
 * due to enters/exits/forced team changes
 */
function SendScoreboardMessageToAllClients () {
	for (var i = 0; i < level.maxclients; i++) {
		if (level.clients[i].pers.connected === CON.CONNECTED) {
			DeathmatchScoreboardMessage(level.gentities[i]);
		}
	}
}

/**
 * ScoreIsTied
 */
function ScoreIsTied() {
	if (level.numPlayingClients < 2) {
		return false;
	}

	if (g_gametype() >= GT.TEAM) {
		return (level.teamScores[TEAM.RED] === level.teamScores[TEAM.BLUE]);
	}

	var a = level.clients[level.sortedClients[0]].ps.persistant[PERS.SCORE];
	var b = level.clients[level.sortedClients[1]].ps.persistant[PERS.SCORE];

	return (a == b);
}

/**
 * MoveClientToIntermission
 *
 * When the intermission starts, this will be called for all players.
 * If a new client connects, this will be called after the spawn function.
 */
function MoveClientToIntermission(ent) {
	// Take out of follow mode if needed.
	if (ent.client.sess.spectatorState === SPECTATOR.FOLLOW) {
		StopFollowing(ent);
	}

	var origin = vec3.create();
	var angles = vec3.create();
	SelectIntermissionSpawnPoint(origin, angles, ent.arena.number);

	// Move to the spot.
	vec3.set(origin, ent.s.origin);
	vec3.set(origin, ent.client.ps.origin);
	vec3.set(angles, ent.client.ps.viewangles);
	ent.client.ps.pm_type = PM.INTERMISSION;

	// Clean up powerup info.
// 	memset(ent.client.ps.powerups, 0, ent.client.ps.powerups.length);

	ent.client.ps.eFlags = 0;
	ent.s.eFlags = 0;
	ent.s.eType = ET.GENERAL;
	ent.s.modelIndex = 0;
	ent.s.loopSound = 0;
	ent.s.event = 0;
	ent.contents = 0;
}

/*
 * ExitLevel
 *
 * When the intermission has been exited, the server is either killed
 * or moved to a new level based on the "nextmap" cvar
 */
function ExitLevel() {
// 	char nextmap[MAX_STRING_CHARS];
// 	char d1[MAX_STRING_CHARS];

// 	//bot interbreeding
// 	BotInterbreedEndMatch();

	// if we are running a tournement map, kick the loser to spectator status,
	// which will automatically grab the next spectator and restart
// 	if (g_gametype() == GT.TOURNAMENT ) {
// 		if (!level.restarted) {
// 			RemoveTournamentLoser();
// 			trap_SendConsoleCommand( EXEC_APPEND, "map_restart 0\n" );
// 			level.restarted = true;
// 			level.changemap = null;
// 			level.intermissiontime = 0;
// 		}
// 		return;
// 	}

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

	// // Reset all the scores so we don't enter the intermission again.
	// level.teamScores[TEAM.RED] = 0;
	// level.teamScores[TEAM.BLUE] = 0;

	for (var i = 0; i < level.maxclients; i++) {
		var client = level.clients[i];

		if (client.pers.connected !== CON.CONNECTED) {
			continue;
		}

		client.ps.persistant[PERS.SCORE] = 0;
	}

	// We need to do this here before changing to CON_CONNECTING.
	WriteWorldSession();

	// Change all client states to connecting, so the early players into the
	// next level will know the others aren't done reconnecting.
	for (var i = 0; i < level.maxclients; i++) {
		if (level.clients[i].pers.connected === CON.CONNECTED) {
			level.clients[i].pers.connected = CON.CONNECTING;
		}
	}
}

/**
 * LogExit
 *
 * Append information about this game to the log file
 */
function LogExit(str) {
	var numSorted;
	var cl;

// 	G_LogPrintf( "Exit: %s\n", str );

	// RD: Why the hell is this in the LogExit function? o.o
	level.intermissionQueued = level.time;

	// This will keep the clients from playing any voice sounds
	// that will get cut off when the queued intermission starts.
	sv.SetConfigstring('intermission', 1);

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
// 		if (client.sess.sessionTeam == TEAM.SPECTATOR) {
// 			continue;
// 		}
//
// 		if (client.pers.connected == CON.CONNECTING) {
// 			continue;
// 		}
//
// 		ping = client.ps.ping < 999 ? client.ps.ping : 999;
//
// 		G_LogPrintf( "score: %i  ping: %i  client: %i %s\n", cl.ps.persistant[PERS_SCORE], ping, level.sortedClients[i],	cl.pers.netname );
// 	}
}

/**********************************************************
 *
 * Player Counting / Score Sorting
 *
 **********************************************************/

/**
 * CalculateRanks
 *
 * Recalculates the score ranks of all players.
 * This will be called on every client connect, begin, disconnect, death,
 * team change and arena restart.
 */
function CalculateRanks() {
	for (var i = 0; i < level.arenas.length; i++) {
		CalculateRanksForArena(level.arenas[i]);
	}

	// See if it is time to end the level.
	CheckExitRules();

	// If we are at the intermission, send the new info to everyone.
	if (level.intermissiontime) {
		SendScoreboardMessageToAllClients();
	}
}

/**
 * CalculateRanksForArena
 */
function CalculateRanksForArena(arena) {
	var rank;
	var score;
	var newScore;

	// arena.follow1 = -1;
	// arena.follow2 = -1;
	arena.numConnectedClients = 0;
	arena.numNonSpectatorClients = 0;
	arena.numPlayingClients = 0;

	// for (var i = 0; i < arena.numteamVotingClients.length; i++) {
	// 	arena.numteamVotingClients[i] = 0;
	// }

	for (var i = 0; i < level.maxclients; i++) {
		var client = level.clients[i];

		if (client.pers.connected === CON.DISCONNECTED) {
			continue;
		}

		if (client.arenaNum !== arena.number) {
			continue;
		}

		arena.sortedClients[arena.numConnectedClients] = i;
		arena.numConnectedClients += 1;

		if (client.sess.sessionTeam !== TEAM.SPECTATOR) {
			arena.numNonSpectatorClients += 1;

			// Decide if this should be auto-followed.
			if (client.pers.connected === CON.CONNECTED) {
				arena.numPlayingClients += 1;

				// if (level.clients[i].sess.sessionTeam == TEAM.RED) {
				// 	arena.numteamVotingClients[0] += 1;
				// } else if (level.clients[i].sess.sessionTeam == TEAM.BLUE) {
				// 	arena.numteamVotingClients[1] += 1;
				// }

				// if (arena.follow1 === -1) {
				// 	arena.follow1 = i;
				// } else if (arena.follow2 === -1) {
				// 	arena.follow2 = i;
				// }
			}
		}
	}

	arena.sortedClients.sort(SortRanks);

	// Set the rank value for all clients that are connected and not spectators.
	if (g_gametype() >= GT.TEAM) {
		// In team games, rank is just the order of the teams, 0=red, 1=blue, 2=tied.
		for (var i = 0; i < arena.numConnectedClients; i++) {
			var client = level.clients[arena.sortedClients[i]];

			if (arena.teamScores[TEAM.RED] === arena.teamScores[TEAM.BLUE]) {
				client.ps.persistant[PERS.RANK] = 2;
			} else if (arena.teamScores[TEAM.RED] > arena.teamScores[TEAM.BLUE]) {
				client.ps.persistant[PERS.RANK] = 0;
			} else {
				client.ps.persistant[PERS.RANK] = 1;
			}
		}
	} else {
		rank = -1;
		score = 0;
		for (var i = 0; i < arena.numPlayingClients; i++) {
			var client = level.clients[arena.sortedClients[i]];

			newScore = client.ps.persistant[PERS.SCORE];

			if (i === 0 || newScore !== score) {
				rank = i;
				// Assume we aren't tied until the next client is checked.
				level.clients[arena.sortedClients[i]].ps.persistant[PERS.RANK] = rank;
			} else {
				// We are tied with the previous client.
				level.clients[arena.sortedClients[i - 1]].ps.persistant[PERS.RANK] = rank | RANK_TIED_FLAG;
				level.clients[arena.sortedClients[i    ]].ps.persistant[PERS.RANK] = rank | RANK_TIED_FLAG;
			}

			score = newScore;
		}
	}

	// Set the CS_SCORES1/2 configstrings, which will be visible to everyone.
	if (g_gametype() >= GT.TEAM) {
		// In CA, just show alive players in count.
		var count1;
		var count2;
		if (g_gametype() === GT.CLANARENA) {
			count1 = TeamAliveCount(arena, TEAM.RED);
			count2 = TeamAliveCount(arena, TEAM.BLUE);
		} else {
			count1 = TeamCount(arena, TEAM.RED, null);
			count2 = TeamCount(arena, TEAM.BLUE, null);
		}

		sv.SetConfigstring('score1', { s: arena.teamScores[TEAM.RED],  c: count1 });
		sv.SetConfigstring('score2', { s: arena.teamScores[TEAM.BLUE], c: count2 });
	} else {
		var n1 = arena.sortedClients[0];
		var n2 = arena.sortedClients[1];

		if (arena.numConnectedClients === 0) {
			sv.SetConfigstring('score1', { s: SCORE_NOT_PRESENT });
			sv.SetConfigstring('score2', { s: SCORE_NOT_PRESENT });
		} else if (arena.numConnectedClients === 1) {
			sv.SetConfigstring('score1', { s: level.clients[n1].ps.persistant[PERS.SCORE], n: n1 });
			sv.SetConfigstring('score2', { s: SCORE_NOT_PRESENT });
		} else {
			sv.SetConfigstring('score1', { s: level.clients[n1].ps.persistant[PERS.SCORE], n: n1 });
			sv.SetConfigstring('score2', { s: level.clients[n2].ps.persistant[PERS.SCORE], n: n2 });
		}
	}
}

/**
 * SortRanks
 */
function SortRanks(a, b) {
	var ca = level.clients[a];
	var cb = level.clients[b];

	// Sort special clients last.
	if (ca.sess.spectatorState === SPECTATOR.SCOREBOARD || ca.sess.spectatorClient < 0) {
		return 1;
	}
	if (cb.sess.spectatorState === SPECTATOR.SCOREBOARD || cb.sess.spectatorClient < 0) {
		return -1;
	}

	// Then connecting clients.
	if (ca.pers.connected === CON.CONNECTING) {
		return 1;
	}
	if (cb.pers.connected === CON.CONNECTING) {
		return -1;
	}

	// Then spectators.
	if (ca.sess.sessionTeam == TEAM.SPECTATOR && cb.sess.sessionTeam == TEAM.SPECTATOR) {
		if (ca.sess.spectatorNum > cb.sess.spectatorNum) {
			return -1;
		}
		if (ca.sess.spectatorNum < cb.sess.spectatorNum) {
			return 1;
		}
		return 0;
	}
	if (ca.sess.sessionTeam == TEAM.SPECTATOR) {
		return 1;
	}
	if (cb.sess.sessionTeam == TEAM.SPECTATOR) {
		return -1;
	}

	// Then sort by score.
	if (ca.ps.persistant[PERS.SCORE] > cb.ps.persistant[PERS.SCORE]) {
		return -1;
	}
	if (ca.ps.persistant[PERS.SCORE] < cb.ps.persistant[PERS.SCORE]) {
		return 1;
	}
	return 0;
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