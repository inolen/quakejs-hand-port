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

			if (isNaN(num)) {
				continue;
			}

			if (arenas.indexOf(num) === -1) {
				arenas.push(num);
			}
		}
	}

	for (var i = 0; i < arenas.length; i++) {
		var num = arenas[i];

		var arena = new ArenaLocals();
		arena.arenaNum = num;

		// Set current arena for entity spawning purposes.
		level.arena = level.arenas[num] = arena;

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
function SetArenaConfigstring(key, val) {
	var arr = sv.GetConfigstring(key) || [];

	arr[level.arena.arenaNum] = val;

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
function CheckWarmup() {
	// Check because we run 3 game frames before calling Connect and/or ClientBegin
	// for clients on a map_restart.
	if (level.arena.numPlayingClients === 0) {
		return;
	}

	if (g_gametype() === GT.TOURNAMENT) {
		CheckTournamentWarmup();
	} else if (g_gametype() >= GT.TEAM) {
		CheckTeamWarmup();
	}
}

/**
 * ChangeWarmupState
 */
function ChangeWarmupState(warmupTime) {
	if (level.arena.warmupTime === warmupTime) {
		return;
	}

	level.arena.warmupTime = warmupTime;
	SetArenaConfigstring('warmup', level.arena.warmupTime);

	log('Setting warmup for', level.arena.arenaNum, level.arena.warmupTime);
}

/**
 * CheckTournamentWarmup
 */
function CheckTournamentWarmup() {
	// Pull in a spectator if needed.
	var next;
	while ((next = PopClientFromQueue())) {
		SetTeam(next.client, 'f');
	}

	// If we don't have two players, go back to "waiting for players".
	if (level.arena.numPlayingClients !== 2) {
		ChangeWarmupState(WARMUP_WAITING);
		return;
	}

	if (level.arena.warmupTime === WARMUP_OVER) {
		return;
	}

	// // If the warmup is changed at the console, restart it.
	// if ( g_warmup.modificationCount != level.warmupModificationCount ) {
	// 	level.warmupModificationCount = g_warmup.modificationCount;
	// 	level.warmupTime = -1;
	// }

	// If all players have arrived, start the countdown.
	if (level.arena.warmupTime < 0) {
		if (level.arena.numPlayingClients === 2) {
			// Fudge by -1 to account for extra delays.
			var warmupTime = 0;
			if (g_warmup() > 1) {
				warmupTime = level.time + (g_warmup() - 1) * 1000;
			}

			ChangeWarmupState(warmupTime);
		}
		return;
	}

	// If the warmup time has counted down, restart.
	if (level.time > level.arena.warmupTime) {
		// level.restarted = true;
		// gms.warmupDisabled = true;
		// com.ExecuteBuffer('map_restart 0');
		return;
	}
}

/**
 * CheckTeamWarmup
 */
function CheckTeamWarmup() {
	var counts = new Array(TEAM.NUM_TEAMS);
	var notEnough = false;

	if (g_gametype() > GT.TEAM) {
		counts[TEAM.BLUE] = TeamCount(TEAM.BLUE, ENTITYNUM_NONE);
		counts[TEAM.RED] = TeamCount(TEAM.RED, ENTITYNUM_NONE);

		if (counts[TEAM.RED] < 1 || counts[TEAM.BLUE] < 1) {
			notEnough = true;
		}
	} else if (level.arena.numPlayingClients < 2) {
		notEnough = true;
	}

	if (notEnough) {
		// In CA, abruptly end the round.
		if (g_gametype() === GT.CLANARENA && level.arena.warmupTime !== WARMUP_WAITING) {
			EndRound(null);
		}

		ChangeWarmupState(WARMUP_WAITING);
		return;  // still waiting for team members
	}

	if (level.arena.warmupTime === WARMUP_OVER) {
		return;
	}

	// // If the warmup is changed at the console, restart it.
	// if ( g_warmup.modificationCount != level.warmupModificationCount ) {
	// 	level.warmupModificationCount = g_warmup.modificationCount;
	// 	level.warmupTime = -1;
	// }

	// If all players have arrived, start the countdown.
	if (level.arena.warmupTime < 0) {
		// Fudge by -1 to account for extra delays.
		var warmupTime = 0;
		if (g_warmup() > 1) {
			warmupTime = level.time + (g_warmup() - 1) * 1000;
		}

		ChangeWarmupState(warmupTime);
		return;
	}

	// If the warmup time has counted down, restart.
	if (level.time > level.arena.warmupTime) {
		if (g_gametype() === GT.CLANARENA) {
			StartRound();
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
function CheckRoundRules() {
	// Only CA mode has rounds.
	if (g_gametype() !== GT.CLANARENA) {
		return;
	}

	// Need to restart once it's time.
	if (level.arena.restartTime) {
		if (level.time > level.arena.restartTime) {
			RestartRound();
		}
		return;
	}

	// End the round once one team has killed off the other.
	if (level.arena.warmupTime === WARMUP_OVER) {
		var counts = new Array(TEAM.NUM_TEAMS);

		counts[TEAM.RED] = TeamAliveCount(TEAM.RED);
		counts[TEAM.BLUE] = TeamAliveCount(TEAM.BLUE);

		if (!counts[TEAM.RED]) {
			EndRound(TEAM.BLUE);
		} else if (!counts[TEAM.BLUE]) {
			EndRound(TEAM.RED);
		}
	}
}

/**
 * StartRound
 *
 * Called after warmup is over.
 */
function StartRound() {
	log('StartRound');

	// Put the brakes on warmup.
	ChangeWarmupState(WARMUP_OVER);
}

/**
 * EndRound
 */
function EndRound(winningTeam) {
	log('EndRound');

	if (winningTeam !== null) {
		level.arena.teamScores[winningTeam] += 1;
	}
	level.arena.restartTime = level.time + 4000;
	level.arena.lastWinningTeam = winningTeam;
}

/**
 * RestartRound
 *
 * Called a few seconds after a round has ended.
 */
function RestartRound() {
	log('RestartRound');

	level.arena.restartTime = 0;

	ChangeWarmupState(WARMUP_WAITING);

	CycleQueuedClients();

	CalculateRanks();
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
function CheckMatchRules() {
	// // If at the intermission, wait for all non-bots to
	// // signal ready, then go to next level
	// if (level.arena.intermissiontime) {
	// 	CheckIntermissionExit();
	// 	return;
	// }

	// if (level.arena.intermissionQueued) {
	// 	if (level.time - level.arena.intermissionQueued >= INTERMISSION_DELAY_TIME) {
	// 		level.arena.intermissionQueued = 0;
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
function ScoreIsTied() {
	if (level.arena.numPlayingClients < 2) {
		return false;
	}

	if (g_gametype() >= GT.TEAM) {
		return (level.arena.teamScores[TEAM.RED] === level.arena.teamScores[TEAM.BLUE]);
	}

	var a = level.clients[level.arena.sortedClients[0]].ps.persistant[PERS.SCORE];
	var b = level.clients[level.arena.sortedClients[1]].ps.persistant[PERS.SCORE];

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
 * PopClientFromQueue
 *
 * If there are less than teamsize players, put a
 * spectator in the game and restart.
 */
function PopClientFromQueue() {
	var clientsNeeded = 2;
	if (g_gametype >= GT.TEAM) {
		clientsNeeded = TEAM_SIZE * 2;
	}

	if (level.arena.numPlayingClients >= clientsNeeded) {
		return null;
	}

	var nextInLine = null;

	for (var i = 0; i < level.maxclients; i++) {
		var ent = level.gentities[i];

		if (!ent.inuse) {
			continue;
		}

		if (ent.s.arenaNum !== level.arena.arenaNum) {
			continue;
		}

		if (ent.client.pers.teamState.state !== TEAM_STATE.QUEUED) {
			continue;
		}

		// Never select the dedicated follow or scoreboard clients.
		if (ent.client.sess.spectatorState === SPECTATOR.SCOREBOARD ||
			ent.client.sess.spectatorClient < 0) {
			continue;
		}

		if (!nextInLine || ent.client.sess.spectatorNum > nextInLine.client.sess.spectatorNum) {
			nextInLine = ent;
		}
	}

	if (nextInLine) {
		nextInLine.client.pers.teamState.state = TEAM_STATE.BEGIN;

		log('Popping client', nextInLine.client.ps.clientNum, 'from queue');
	}

	return nextInLine;
}

/**
 * PushClientToQueue
 *
 * Add client to end of the queue.
 */
function PushClientToQueue(ent) {
	var client = ent.client;

	client.pers.teamState.state = TEAM_STATE.QUEUED;

	log('Pushing client', client.ps.clientNum, 'to end of queue');

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
		} else if (cur.client.sess.spectatorNum !== -1) {
			cur.client.sess.spectatorNum++;
		}
	}
}

/**
 * CycleQueuedClients
 */
function CycleQueuedClients() {
	log('CycleQueuedClients');

	// If there was no winning team, respawn anyone that's still alive.
	if (!level.arena.lastWinningTeam) {
		for (var i = 0; i < level.maxclients; i++) {
			var ent = level.gentities[i];

			if (!ent.inuse) {
				continue;
			}

			if (ent.s.arenaNum !== level.arena.arenaNum) {
				continue;
			}

			if (ent.client.pers.teamState.state !== TEAM_STATE.QUEUED) {
				ClientSpawn(ent);
			}
		}
	}
	// Otherwise, remove losers and respawn winners.
	else {
		// Only if we have size-restricted teams.
		if (TEAM_SIZE > 0) {
			for (var i = 0; i < level.maxclients; i++) {
				var ent = level.gentities[i];

				if (!ent.inuse) {
					continue;
				}

				if (ent.s.arenaNum !== level.arena.arenaNum) {
					continue;
				}

				if (ent.client.sess.sessionTeam === TEAM.SPECTATOR) {
					continue;
				}

				if (ent.client.sess.sessionTeam !== level.arena.lastWinningTeam) {
					PushClientToQueue(ent);

					SetTeam(ent.client, 's');
				}
			}
		}

		// Respawn the winners.
		for (var i = 0; i < level.maxclients; i++) {
			var ent = level.gentities[i];

			if (!ent.inuse) {
				continue;
			}

			if (ent.s.arenaNum !== level.arena.arenaNum) {
				continue;
			}

			if (ent.client.sess.sessionTeam === level.arena.lastWinningTeam) {
				ClientSpawn(ent);
			}
		}
	}

	// Now, winners are freshly spawned, losers are queued.
	// Spawn in the next wave of clients.
	var next;
	while ((next = PopClientFromQueue())) {
		// For size-restricted games, pick the appropriate team.
		if (TEAM_SIZE > 0) {
			SetTeam(next.client, 'f');
		}
		// Otherwise, spawn to the player's current team.
		else {
			next.client.sess.spectatorState = SPECTATOR.NOT;
			next.client.pers.teamState.state = TEAM_STATE.BEGIN;

			ClientSpawn(next);
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
 * CalculateRanks
 */
function CalculateRanks() {
	var rank;
	var score;
	var newScore;

	// level.arena.follow1 = -1;
	// level.arena.follow2 = -1;
	level.arena.numConnectedClients = 0;
	level.arena.numNonSpectatorClients = 0;
	level.arena.numPlayingClients = 0;

	// for (var i = 0; i < level.numteamVotingClients.length; i++) {
	// 	level.numteamVotingClients[i] = 0;
	// }

	for (var i = 0; i < level.maxclients; i++) {
		var ent = level.gentities[i];

		if (!ent.inuse) {
			continue;
		}

		if (ent.s.arenaNum !== level.arena.arenaNum) {
			continue;
		}

		level.arena.sortedClients[level.arena.numConnectedClients] = i;
		level.arena.numConnectedClients += 1;

		if (ent.client.sess.sessionTeam !== TEAM.SPECTATOR) {
			level.arena.numNonSpectatorClients += 1;

			// Decide if this should be auto-followed.
			if (ent.client.pers.connected === CON.CONNECTED) {
				level.arena.numPlayingClients += 1;

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

	level.arena.sortedClients.sort(SortRanks);

	// Set the rank value for all clients that are connected and not spectators.
	if (g_gametype() >= GT.TEAM) {
		// In team games, rank is just the order of the teams, 0=red, 1=blue, 2=tied.
		for (var i = 0; i < level.arena.numConnectedClients; i++) {
			var client = level.clients[level.arena.sortedClients[i]];

			if (level.arena.teamScores[TEAM.RED] === level.arena.teamScores[TEAM.BLUE]) {
				client.ps.persistant[PERS.RANK] = 2;
			} else if (level.arena.teamScores[TEAM.RED] > level.arena.teamScores[TEAM.BLUE]) {
				client.ps.persistant[PERS.RANK] = 0;
			} else {
				client.ps.persistant[PERS.RANK] = 1;
			}
		}
	} else {
		rank = -1;
		score = 0;
		for (var i = 0; i < level.arena.numPlayingClients; i++) {
			var client = level.clients[level.arena.sortedClients[i]];

			newScore = client.ps.persistant[PERS.SCORE];

			if (i === 0 || newScore !== score) {
				rank = i;
				// Assume we aren't tied until the next client is checked.
				level.clients[level.arena.sortedClients[i]].ps.persistant[PERS.RANK] = rank;
			} else {
				// We are tied with the previous client.
				level.clients[level.arena.sortedClients[i - 1]].ps.persistant[PERS.RANK] = rank | RANK_TIED_FLAG;
				level.clients[level.arena.sortedClients[i    ]].ps.persistant[PERS.RANK] = rank | RANK_TIED_FLAG;
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
			count1 = TeamAliveCount(TEAM.RED);
			count2 = TeamAliveCount(TEAM.BLUE);
		} else {
			count1 = TeamCount(TEAM.RED, ENTITYNUM_NONE);
			count2 = TeamCount(TEAM.BLUE, ENTITYNUM_NONE);
		}

		SetArenaConfigstring('score1', { s: level.arena.teamScores[TEAM.RED],  c: count1 });
		SetArenaConfigstring('score2', { s: level.arena.teamScores[TEAM.BLUE], c: count2 });
	} else {
		var n1 = level.arena.sortedClients[0];
		var n2 = level.arena.sortedClients[1];

		if (level.arena.numConnectedClients === 0) {
			SetArenaConfigstring('score1', { s: SCORE_NOT_PRESENT });
			SetArenaConfigstring('score2', { s: SCORE_NOT_PRESENT });
		} else if (level.arena.numConnectedClients === 1) {
			SetArenaConfigstring('score1', { s: level.clients[n1].ps.persistant[PERS.SCORE], n: n1 });
			SetArenaConfigstring('score2', { s: SCORE_NOT_PRESENT });
		} else {
			SetArenaConfigstring('score1', { s: level.clients[n1].ps.persistant[PERS.SCORE], n: n1 });
			SetArenaConfigstring('score2', { s: level.clients[n2].ps.persistant[PERS.SCORE], n: n2 });
		}
	}

	// // See if it is time to end the level.
	// CheckExitRules();

	// If we are at the intermission, send the new info to everyone.
	if (level.arena.intermissiontime) {
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