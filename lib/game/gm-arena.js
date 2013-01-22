/**
 * InitArenas
 */
function InitArenas() {
	var arenas = [0];

	// Store off unique arena numbers from intermission points.
	// NOTE This is only used by old school RA3 maps for now.
	var entityDefs = sv.GetEntityDefs();

	for (var i = 0; i < entityDefs.length; i++) {
		var def = entityDefs[i];

		if (def.classname === 'info_player_intermission') {
			var num = parseInt(def.arena, 10);

			if (arenas.indexOf(num) === -1) {
				arenas.push(num);
			}
		}
	}

	for (var i = 0; i < arenas.length; i++) {
		var num = arenas[i];

		var arena = new ArenaLocals();
		arena.arenaNum = num;

		level.arenas[num] = arena;

		// FIXME We don't really need to spawn all map entities for each arena,
		// especially static, stateless ones such as triggers and what not.
		SpawnAllEntitiesFromDefs(num);
	}

	// // Make sure we have flags for CTF, etc.
	// if (g_gametype() >= GT.TEAM) {
	// 	Team_CheckItems();
	// }
}

/**
 * SetArenaConfigstring
 */
function SetArenaConfigstring(arena, key, val) {
	var arr = sv.GetConfigstring(key);
	if (!arr) {
		arr = [];
	}

	arr[arena.arenaNum] = val;

	sv.SetConfigstring(key, arr);
}

/**********************************************************
 *
 * Warmup
 *
 **********************************************************/

/**
 * CheckWarmup
 */
function CheckWarmup(arena) {
	// Check because we run 3 game frames before calling Connect and/or ClientBegin
	// for clients on a map_restart.
	if (arena.numPlayingClients === 0) {
		return;
	}

	if (g_gametype() === GT.TOURNAMENT) {
		CheckTournamentWarmup(arena);
	} else if (g_gametype() >= GT.TEAM) {
		CheckTeamWarmup(arena);
	}
}

/**
 * ChangeWarmupState
 */
function ChangeWarmupState(arena, warmupTime) {
	if (arena.warmupTime === warmupTime) {
		return;
	}

	arena.warmupTime = warmupTime;
	SetArenaConfigstring(arena, 'warmup', arena.warmupTime);

	// In CA, spawn back in dead clients when we re-enter warmup.
	if (g_gametype() === GT.CLANARENA && arena.warmupTime === WARMUP_WAITING) {
		EndRound(arena, null);
	}
}

/**
 * CheckTournamentWarmup
 */
function CheckTournamentWarmup(arena) {
	// Pull in a spectator if needed.
	PopClientsFromQueue(arena);

	// If we don't have two players, go back to "waiting for players".
	if (arena.numPlayingClients !== 2) {
		ChangeWarmupState(arena, WARMUP_WAITING);
		return;
	}

	if (arena.warmupTime === WARMUP_OVER) {
		return;
	}

	// // If the warmup is changed at the console, restart it.
	// if ( g_warmup.modificationCount != level.warmupModificationCount ) {
	// 	level.warmupModificationCount = g_warmup.modificationCount;
	// 	level.warmupTime = -1;
	// }

	// If all players have arrived, start the countdown.
	if (arena.warmupTime < 0) {
		if (arena.numPlayingClients === 2) {
			// Fudge by -1 to account for extra delays.
			var warmupTime = 0;
			if (g_warmup() > 1) {
				warmupTime = level.time + (g_warmup() - 1) * 1000;
			}

			ChangeWarmupState(arena, warmupTime);
		}
		return;
	}

	// If the warmup time has counted down, restart.
	if (level.time > arena.warmupTime) {
		// level.restarted = true;
		// gms.warmupDisabled = true;
		// com.ExecuteBuffer('map_restart 0');
		return;
	}
}

/**
 * CheckTeamWarmup
 */
function CheckTeamWarmup(arena) {
	var counts = new Array(TEAM.NUM_TEAMS);
	var notEnough = false;

	if (g_gametype() > GT.TEAM) {
		counts[TEAM.BLUE] = TeamCount(TEAM.BLUE, arena.arenaNum, null);
		counts[TEAM.RED] = TeamCount(TEAM.RED, arena.arenaNum, null);

		if (counts[TEAM.RED] < 1 || counts[TEAM.BLUE] < 1) {
			notEnough = true;
		}
	} else if (arena.numPlayingClients < 2) {
		notEnough = true;
	}

	if (notEnough) {
		ChangeWarmupState(arena, WARMUP_WAITING);
		return;  // still waiting for team members
	}

	if (arena.warmupTime === WARMUP_OVER) {
		return;
	}

	// // If the warmup is changed at the console, restart it.
	// if ( g_warmup.modificationCount != level.warmupModificationCount ) {
	// 	level.warmupModificationCount = g_warmup.modificationCount;
	// 	level.warmupTime = -1;
	// }

	// If all players have arrived, start the countdown.
	if (arena.warmupTime < 0) {
		// Fudge by -1 to account for extra delays.
		var warmupTime = 0;
		if (g_warmup() > 1) {
			warmupTime = level.time + (g_warmup() - 1) * 1000;
		}

		ChangeWarmupState(arena, warmupTime);
		return;
	}

	// If the warmup time has counted down, restart.
	if (level.time > arena.warmupTime) {
		if (g_gametype() === GT.CLANARENA) {
			StartRound(arena);
		} else {
			// // Non-CA games do a full map_restart once warmup is over.
			// level.restarted = true;
			// gms.warmupDisabled = true;
			// com.ExecuteBuffer('map_restart 0');
		}
		return;
	}
}

/**********************************************************
 *
 * Rounds
 *
 **********************************************************/

/**
 * CheckRoundRules
 */
function CheckRoundRules(arena) {
	// Only CA mode has rounds.
	if (g_gametype() !== GT.CLANARENA) {
		return;
	}

	if (arena.warmupTime !== WARMUP_OVER) {
		return;
	}

	// Need to restart once it's time.
	if (arena.restartTime) {
		if (level.time > arena.restartTime) {
			RestartRound(arena);
		}
		return;
	}

	// End the round once one team has killed off the other.
	var counts = new Array(TEAM.NUM_TEAMS);

	counts[TEAM.RED] = TeamAliveCount(TEAM.RED, arena.arenaNum);
	counts[TEAM.BLUE] = TeamAliveCount(TEAM.BLUE, arena.arenaNum);

	if (!counts[TEAM.RED]) {
		EndRound(arena, TEAM.BLUE);
	} else if (!counts[TEAM.BLUE]) {
		EndRound(arena, TEAM.RED);
	}
}

/**
 * StartRound
 *
 * Called after warmup is over.
 */
function StartRound(arena) {
	log('StartRound');

	// Put the brakes on warmup.
	ChangeWarmupState(arena, WARMUP_OVER);

	// Everybody should already have been spawned back in by RestartRound, but
	// perhaps they've managed to kill themselves during warmup.
	SpawnDeadClients(arena);
}

/**
 * EndRound
 */
function EndRound(arena, winningTeam) {
	log('EndRound');

	// Dropped to WARMUP_WAITING, respawn dead players
	// so they're not so bored.
	if (winningTeam === null) {
		SpawnDeadClients(arena);
		return;
	}

	arena.teamScores[winningTeam] += 1;
	arena.restartTime = level.time + 4000;
	arena.lastWinningTeam = winningTeam;
}

/**
 * RestartRound
 *
 * Called a few seconds after a round has ended.
 */
function RestartRound(arena) {
	log('RestartRound');

	arena.restartTime = 0;

	// Start the warmup.
	ChangeWarmupState(arena, WARMUP_WAITING);

	// Cycle the queue in team-sized games.
	if (TEAM_SIZE > 0) {
		for (var i = 0; i < level.maxclients; i++) {
			var ent = level.gentities[i];

			if (!ent.inuse) {
				continue;
			}

			if (ent.s.arenaNum !== arena.arenaNum) {
				continue;
			}

			if (ent.client.sess.sessionTeam === TEAM.SPECTATOR) {
				continue;
			}

			if (ent.client.sess.sessionTeam !== arena.lastWinningTeam) {
				PushClientToQueue(ent);
			}
		}

		PopClientsFromQueue(arena);
	}

	// Respawn everybody.
	for (var i = 0; i < level.maxclients; i++) {
		var ent = level.gentities[i];

		if (!ent.inuse) {
			continue;
		}

		if (ent.client.sess.sessionTeam === TEAM.SPECTATOR) {
			continue;
		}

		ent.client.sess.spectatorState = SPECTATOR.NOT;
		ClientSpawn(ent);
	}

	// Update team counts.
	CalculateRanks(arena);
}

/**
 * SpawnDeadClients
 */
function SpawnDeadClients(arena) {
	for (var i = 0; i < level.maxclients; i++) {
		var ent = level.gentities[i];

		if (!ent.inuse) {
			continue;
		}

		if (ent.s.arenaNum !== arena.arenaNum) {
			continue;
		}

		if (ent.client.sess.sessionTeam === TEAM.SPECTATOR) {
			continue;
		}

		if (ent.client.ps.pm_type === PM.DEAD) {
			ClientSpawn(ent);
		}
	}
}

/**********************************************************
 *
 * Matches
 *
 **********************************************************/

/**
 * CheckMatchRules
 *
 * There will be a delay between the time the exit is qualified for
 * and the time everyone is moved to the intermission spot, so you
 * can see the last frag.
 */
function CheckMatchRules(arena) {
	// // If at the intermission, wait for all non-bots to
	// // signal ready, then go to next level
	// if (arena.intermissiontime) {
	// 	CheckIntermissionExit();
	// 	return;
	// }

	// if (arena.intermissionQueued) {
	// 	if (level.time - arena.intermissionQueued >= INTERMISSION_DELAY_TIME) {
	// 		arena.intermissionQueued = 0;
	// 		BeginIntermission();
	// 	}
	// 	return;
	// }

	// Check for sudden death.
	// if (ScoreIsTied()) {
	// 	// Always wait for sudden death.
	// 	return;
	// }

	// if (g_timelimit() && level.warmupTime === WARMUP_OVER) {
	// 	if (level.time - level.startTime >= g_timelimit() * 60000) {
	// 		sv.SendServerCommand(null, 'print', 'Timelimit hit.');
	// 		QueueIntermission();
	// 		return;
	// 	}
	// }

	// if (g_gametype() < GT.CTF && g_fraglimit()) {
	// 	if (level.teamScores[TEAM.RED] >= g_fraglimit()) {
	// 		sv.SendServerCommand(null, 'print', 'Red hit the fraglimit.');
	// 		QueueIntermission();
	// 		return;
	// 	}

	// 	if (level.teamScores[TEAM.BLUE] >= g_fraglimit()) {
	// 		sv.SendServerCommand(null, 'print', 'Blue hit the fraglimit.');
	// 		QueueIntermission();
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
	// 			QueueIntermission();
	// 			return;
	// 		}
	// 	}
	// }

	// if (g_gametype() >= GT.CTF && g_gametype() !== GT.CLANARENA && g_capturelimit()) {
	// 	if (level.teamScores[TEAM.RED] >= g_capturelimit()) {
	// 		sv.SendServerCommand(null, 'print', 'Red hit the capturelimit.');
	// 		QueueIntermission();
	// 		return;
	// 	}

	// 	if (level.teamScores[TEAM.BLUE] >= g_capturelimit()) {
	// 		sv.SendServerCommand(null, 'print', 'Blue hit the capturelimit.');
	// 		QueueIntermission();
	// 		return;
	// 	}
	// }
}

/**
 * ScoreIsTied
 */
function ScoreIsTied(arena) {
	if (arena.numPlayingClients < 2) {
		return false;
	}

	if (g_gametype() >= GT.TEAM) {
		return (arena.teamScores[TEAM.RED] === arena.teamScores[TEAM.BLUE]);
	}

	var a = level.clients[arena.sortedClients[0]].ps.persistant[PERS.SCORE];
	var b = level.clients[arena.sortedClients[1]].ps.persistant[PERS.SCORE];

	return (a == b);
}

/**********************************************************
 *
 * Spectator queuing
 *
 * Used by 1v1 and CA rounds.
 *
 **********************************************************/

/**
 * PopClientsFromQueue
 *
 * If there are less than teamsize players, put a
 * spectator in the game and restart.
 */
function PopClientsFromQueue(arena) {
	var clientsNeeded = 2;
	if (g_gametype >= GT.TEAM) {
		clientsNeeded = TEAM_SIZE * 2;
	}

	while (arena.numPlayingClients < clientsNeeded) {
		var nextInLine;

		for (var i = 0; i < level.maxclients; i++) {
			var ent = level.gentities[i];

			if (!ent.inuse) {
				continue;
			}

			if (ent.s.arenaNum !== arena.arenaNum) {
				continue;
			}

			// Never select the dedicated follow or scoreboard clients.
			if (ent.client.sess.sessionTeam !== TEAM.SPECTATOR ||
				ent.client.sess.spectatorNum === -1 ||
				ent.client.sess.spectatorState === SPECTATOR.SCOREBOARD ||
				ent.client.sess.spectatorClient < 0) {
				continue;
			}

			if (!nextInLine || ent.client.sess.spectatorNum > nextInLine.client.sess.spectatorNum) {
				nextInLine = ent;
			}
		}

		// If there is noone else in line, break out.
		if (!nextInLine) {
			return;
		}

		log('Popping client', nextInLine.client.ps.clientNum, 'from queue');

		SetTeam(nextInLine.client, 'f');
	}

	ChangeWarmupState(arena, WARMUP_WAITING);
}

/**
 * PushClientToQueue
 *
 * Add client to end of the queue.
 */
function PushClientToQueue(ent) {
	var client = ent.client;

	log('Pushing client', client.ps.clientNum, 'to end of queue');

	if (client.sess.sessionTeam !== TEAM.SPECTATOR) {
		SetTeam(client, 's');
	}

	for (var i = 0; i < level.maxclients; i++) {
		var cur = level.gentities[i];

		if (!cur.inuse) {
			continue;
		}

		if (cur.s.arenaNum !== ent.s.arenaNum) {
			continue;
		}

		if (cur === ent) {
			cur.client.sess.spectatorNum = 0;
		} else if (cur.client.sess.sessionTeam === TEAM.SPECTATOR &&
		           // Some spectators just want to idle.
		           cur.client.sess.spectatorNum !== -1) {
			cur.client.sess.spectatorNum++;
		}
	}
}

/**********************************************************
 *
 * Intermission
 *
 **********************************************************/

/**
 * QueueIntermission
 */
function QueueIntermission() {
	level.intermissionQueued = level.time;

	// This will keep the clients from playing any voice sounds
	// that will get cut off when the queued intermission starts.
	sv.SetConfigstring('intermission', 1);
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

		if (level.gentities[client.ps.clientNum].r.svFlags & SVF.BOT) {
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

	IntermissionExit();
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
	SelectIntermissionSpawnPoint(origin, angles);

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
	ent.r.contents = 0;
}

/*
 * IntermissionExit
 *
 * When the intermission has been exited, the server is either killed
 * or moved to a new level based on the "nextmap" cvar
 */
function IntermissionExit() {
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

/**********************************************************
 *
 * Player Counting / Score Sorting
 *
 **********************************************************/

/**
 * CalculateArenaRanks
 */
function CalculateArenaRanks(arena) {
	var rank;
	var score;
	var newScore;

	// arena.follow1 = -1;
	// arena.follow2 = -1;
	arena.numConnectedClients = 0;
	arena.numNonSpectatorClients = 0;
	arena.numPlayingClients = 0;

	// for (var i = 0; i < level.numteamVotingClients.length; i++) {
	// 	level.numteamVotingClients[i] = 0;
	// }

	for (var i = 0; i < level.maxclients; i++) {
		var ent = level.gentities[i];

		if (!ent.inuse) {
			continue;
		}

		if (ent.s.arenaNum !== arena.arenaNum) {
			continue;
		}

		arena.sortedClients[arena.numConnectedClients] = i;
		arena.numConnectedClients += 1;

		if (ent.client.sess.sessionTeam !== TEAM.SPECTATOR) {
			arena.numNonSpectatorClients += 1;

			// Decide if this should be auto-followed.
			if (ent.client.pers.connected === CON.CONNECTED) {
				arena.numPlayingClients += 1;

				// if (level.clients[i].sess.sessionTeam == TEAM.RED) {
				// 	level.numteamVotingClients[0] += 1;
				// } else if (level.clients[i].sess.sessionTeam == TEAM.BLUE) {
				// 	level.numteamVotingClients[1] += 1;
				// }

				// if (level.follow1 === -1) {
				// 	level.follow1 = i;
				// } else if (level.follow2 === -1) {
				// 	level.follow2 = i;
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
			count1 = TeamAliveCount(TEAM.RED, arena.arenaNum);
			count2 = TeamAliveCount(TEAM.BLUE, arena.arenaNum);
		} else {
			count1 = TeamCount(TEAM.RED, arena.arenaNum, null);
			count2 = TeamCount(TEAM.BLUE, arena.arenaNum, null);
		}

		SetArenaConfigstring(arena, 'score1', { s: arena.teamScores[TEAM.RED],  c: count1 });
		SetArenaConfigstring(arena, 'score2', { s: arena.teamScores[TEAM.BLUE], c: count2 });
	} else {
		var n1 = arena.sortedClients[0];
		var n2 = arena.sortedClients[1];

		if (arena.numConnectedClients === 0) {
			SetArenaConfigstring(arena, 'score1', { s: SCORE_NOT_PRESENT });
			SetArenaConfigstring(arena, 'score2', { s: SCORE_NOT_PRESENT });
		} else if (arena.numConnectedClients === 1) {
			SetArenaConfigstring(arena, 'score1', { s: level.clients[n1].ps.persistant[PERS.SCORE], n: n1 });
			SetArenaConfigstring(arena, 'score2', { s: SCORE_NOT_PRESENT });
		} else {
			SetArenaConfigstring(arena, 'score1', { s: level.clients[n1].ps.persistant[PERS.SCORE], n: n1 });
			SetArenaConfigstring(arena, 'score2', { s: level.clients[n2].ps.persistant[PERS.SCORE], n: n2 });
		}
	}

	// // See if it is time to end the level.
	// CheckExitRules();

	// If we are at the intermission, send the new info to everyone.
	if (arena.intermissiontime) {
		SendScoreboardMessageToAllClients();
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