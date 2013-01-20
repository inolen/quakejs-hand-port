/**
 * InitArenas
 *
 * Initializes a single default arena, as well as
 * one per unique arena in info_player_intermission.
 */
function InitArenas() {
	var arenas = [0];
	var points = FindEntity({ classname: 'info_player_intermission' });

	for (var i = 0; i < points.length; i++) {
		var point = points[i];

		if (arenas.indexOf(point.arenaNum) === -1) {
			arenas.push(point.arenaNum);
		}
	}

	for (var i = 0; i < arenas.length; i++) {
		var arena = new ArenaLocals();
		arena.number = arenas[i];
		level.arenas[arenas[i]] = arena;
	}

	var zz = 0;
}

/**
 * CheckArenaRules
 */
function CheckArenaRules(arena) {
	CheckWarmup(arena);

	CheckRoundEnd(arena);
}

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
	sv.SetConfigstring('warmup', arena.warmupTime);

	// In CA, spawn back in dead clients when we re-enter warmup.
	if (g_gametype() === GT.CLANARENA && arena.warmupTime === WARMUP_WAITING) {
		SpawnDeadClients(arena);
	}
}

/**
 * CheckTournamentWarmup
 */
function CheckTournamentWarmup(arena) {
	// Pull in a spectator if needed.
	PopClientsFromQueue();

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
		counts[TEAM.BLUE] = TeamCount(arena, TEAM.BLUE, null);
		counts[TEAM.RED] = TeamCount(arena, TEAM.RED, null);

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

/**
 * CheckRoundEnd
 */
function CheckRoundEnd(arena) {
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

	// End the arena once one team has killed off the other.
	var counts = new Array(TEAM.NUM_TEAMS);

	counts[TEAM.RED] = TeamAliveCount(arena, TEAM.RED);
	counts[TEAM.BLUE] = TeamAliveCount(arena, TEAM.BLUE);

	if (!counts[TEAM.RED]) {
		EndRound(arena, TEAM.BLUE);
	} else if (!counts[TEAM.BLUE]) {
		EndRound(arena, TEAM.RED);
	}
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
			var client = level.clients[i];

			if (client.pers.connected === CON.DISCONNECTED) {
				continue;
			}

			if (client.arenaNum !== arena.number ||
				client.sess.sessionTeam === TEAM.SPECTATOR) {
				continue;
			}

			if (client.sess.sessionTeam !== arena.lastWinningTeam) {
				PushClientToQueue(arena, client);
			}
		}

		PopClientsFromQueue(arena);
	}

	// Respawn everybody.
	for (var i = 0; i < level.maxclients; i++) {
		var client = level.clients[i];

		if (client.pers.connected === CON.DISCONNECTED) {
			continue;
		}

		if (client.arenaNum !== arena.number ||
			client.sess.sessionTeam === TEAM.SPECTATOR) {
			continue;
		}

		var ent = level.gentities[i];
		client.sess.spectatorState = SPECTATOR.NOT;
		ClientSpawn(ent);
	}

	// Update team counts.
	CalculateRanks();
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

	if (winningTeam !== null) {
		arena.teamScores[winningTeam] += 1;
	}

	arena.restartTime = level.time + 4000;
	arena.lastWinningTeam = winningTeam;
}

/**
 * SpawnDeadClients
 */
function SpawnDeadClients(arena) {
	for (var i = 0; i < level.maxclients; i++) {
		var ent = level.gentities[i];
		var client = ent.client;

		if (!ent.inuse) {
			continue;
		}

		if (client.arenaNum !== arena.number ||
			client.sess.sessionTeam === TEAM.SPECTATOR) {
			continue;
		}

		if (client.ps.pm_type === PM.DEAD) {
			ClientSpawn(ent);
		}
	}
}

/**********************************************************
 *
 * Queue system
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
			var client = level.clients[i];

			if (client.pers.connected === CON.DISCONNECTED) {
				continue;
			}

			if (client.arenaNum !== arena.number) {
				continue;
			}

			// Never select the dedicated follow or scoreboard clients.
			if (client.sess.sessionTeam !== TEAM.SPECTATOR ||
				client.sess.spectatorNum === -1 ||
				client.sess.spectatorState === SPECTATOR.SCOREBOARD ||
				client.sess.spectatorClient < 0) {
				continue;
			}

			if (!nextInLine || client.sess.spectatorNum > nextInLine.sess.spectatorNum) {
				nextInLine = client;
			}
		}

		// If there is noone else in line, break out.
		if (!nextInLine) {
			return;
		}

		log('Popping client', nextInLine.ps.clientNum, 'from queue');

		SetTeam(nextInLine, 'f');
	}

	ChangeWarmupState(arena, WARMUP_WAITING);
}

/**
 * PushClientToQueue
 *
 * Add client to end of the queue.
 */
function PushClientToQueue(arena, client) {
	log('Pushing client', client.ps.clientNum, 'to end of queue');

	if (client.sess.sessionTeam !== TEAM.SPECTATOR) {
		SetTeam(client, 's');
	}

	for (var i = 0; i < level.maxclients; i++) {
		var curclient = level.clients[i];

		if (curclient.pers.connected === CON.DISCONNECTED) {
			continue;
		}

		if (client.arenaNum !== arena.number) {
			continue;
		}

		if (curclient === client) {
			curclient.sess.spectatorNum = 0;
		} else if (curclient.sess.sessionTeam === TEAM.SPECTATOR &&
			// Some spectators just want to idle.
			curclient.sess.spectatorNum !== -1) {
			curclient.sess.spectatorNum++;
		}
	}
}

/**
 * PickTeam
 */
function PickTeam(arena, ignoreClientNum) {
	var team;

	if (g_gametype() >= GT.TEAM) {
		// Always TEAM.FREE in lobby of CA.
		if (g_gametype() === GT.CLANARENA && arena.number === 0) {
			team = TEAM.FREE;
		} else {
			// Find the team with the least amount of players.
			var counts = new Array(TEAM.NUM_TEAMS);

			counts[TEAM.RED] = TeamCount(arena, TEAM.RED, ignoreClientNum);
			counts[TEAM.BLUE] = TeamCount(arena, TEAM.BLUE, ignoreClientNum);

			if (counts[TEAM.RED] > counts[TEAM.BLUE]) {
				team = TEAM.BLUE;
			} else if (counts[TEAM.BLUE] > counts[TEAM.RED]) {
				team = TEAM.RED;
			}
			// Equal team count, so join the team with the lowest score.
			else if (arena.teamScores[TEAM.RED] > arena.teamScores[TEAM.BLUE]) {
				team = TEAM.BLUE;
			} else {
				team = TEAM.RED;
			}

			var total = counts[TEAM.RED] + counts[TEAM.BLUE];
			if (g_gametype() === GT.CLANARENA && TEAM_SIZE && total >= TEAM_SIZE*2) {
				team = TEAM.SPECTATOR;
			}
		}
	} else {
		team = TEAM.FREE;
	}

	// Override decision if limiting the players.
	if (g_gametype() === GT.TOURNAMENT && arena.numNonSpectatorClients >= 2) {
		team = TEAM.SPECTATOR;
	} else if (g_maxGameClients() > 0 && arena.numNonSpectatorClients >= g_maxGameClients()) {
		team = TEAM.SPECTATOR;
	}

	log('PickTeam', team);

	return team;
}

/**
 * TeamCount
 *
 * Returns number of players on a team
 */
function TeamCount(arena, team, ignoreClientNum) {
	var count = 0;

	for (var i = 0; i < level.maxclients; i++) {
		if (i === ignoreClientNum) {
			continue;
		}

		var client = level.clients[i];

		if (client.pers.connected === CON.DISCONNECTED) {
			continue;
		}

		if (client.sess.sessionTeam !== team ||
			client.arenaNum !== arena.number) {
			continue;
		}

		count++;
	}

	return count;
}

/**
 * TeamAliveCount
 */
function TeamAliveCount(arena, team) {
	var count = 0;

	for (var i = 0; i < level.maxclients; i++) {
		var client = level.clients[i];

		if (client.pers.connected === CON.DISCONNECTED) {
			continue;
		}

		if (client.sess.sessionTeam !== team ||
			client.arenaNum !== arena.number) {
			continue;
		}

		// In CA mode, players are kicked to SPECTATOR.FREE on death,
		// however, while playing their death animation they'll still
		// be SPECTATOR.NOT, so check ps.pm_type as well.
		// FIXME Use a teamstate enum value or something?
		if ((client.sess.spectatorState === SPECTATOR.NOT && client.ps.pm_type !== PM.DEAD)) {
			count++;
		}
	}

	return count;
}