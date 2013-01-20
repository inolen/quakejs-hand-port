/**
 * CheckMatchRules
 */
function CheckMatchRules(match) {
	CheckWarmup(match);

	CheckMatchEnd(match);
}

/**
 * CheckWarmup
 */
function CheckWarmup(match) {
	// Check because we run 3 game frames before calling Connect and/or ClientBegin
	// for clients on a map_restart.
	if (match.numPlayingClients === 0) {
		return;
	}

	if (g_gametype() === GT.TOURNAMENT) {
		CheckTournamentWarmup(match);
	} else if (g_gametype() >= GT.TEAM) {
		CheckTeamWarmup(match);
	}
}

/**
 * ChangeWarmupState
 */
function ChangeWarmupState(match, warmupTime) {
	if (match.warmupTime === warmupTime) {
		return;
	}

	match.warmupTime = warmupTime;
	sv.SetConfigstring('warmup', match.warmupTime);

	// In CA, spawn back in dead clients when we re-enter warmup.
	if (g_gametype() === GT.CLANARENA && match.warmupTime === WARMUP_WAITING) {
		SpawnDeadClients(match);
	}
}

/**
 * CheckTournamentWarmup
 */
function CheckTournamentWarmup(match) {
	// Pull in a spectator if needed.
	PopClientsFromQueue();

	// If we don't have two players, go back to "waiting for players".
	if (match.numPlayingClients !== 2) {
		ChangeWarmupState(match, WARMUP_WAITING);
		return;
	}

	if (match.warmupTime === WARMUP_OVER) {
		return;
	}

	// // If the warmup is changed at the console, restart it.
	// if ( g_warmup.modificationCount != level.warmupModificationCount ) {
	// 	level.warmupModificationCount = g_warmup.modificationCount;
	// 	level.warmupTime = -1;
	// }

	// If all players have arrived, start the countdown.
	if (match.warmupTime < 0) {
		if (match.numPlayingClients === 2) {
			// Fudge by -1 to account for extra delays.
			var warmupTime = 0;
			if (g_warmup() > 1) {
				warmupTime = level.time + (g_warmup() - 1) * 1000;
			}

			ChangeWarmupState(match, warmupTime);
		}
		return;
	}

	// If the warmup time has counted down, restart.
	if (level.time > match.warmupTime) {
		// level.restarted = true;
		// gms.warmupDisabled = true;
		// com.ExecuteBuffer('map_restart 0');
		return;
	}
}

/**
 * CheckTeamWarmup
 */
function CheckTeamWarmup(match) {
	var counts = new Array(TEAM.NUM_TEAMS);
	var notEnough = false;

	if (g_gametype() > GT.TEAM) {
		counts[TEAM.BLUE] = TeamCount(TEAM.BLUE, match, null);
		counts[TEAM.RED] = TeamCount(TEAM.RED, match, null);

		if (counts[TEAM.RED] < 1 || counts[TEAM.BLUE] < 1) {
			notEnough = true;
		}
	} else if (match.numPlayingClients < 2) {
		notEnough = true;
	}

	if (notEnough) {
		ChangeWarmupState(match, WARMUP_WAITING);
		return;  // still waiting for team members
	}

	if (match.warmupTime === WARMUP_OVER) {
		return;
	}

	// // If the warmup is changed at the console, restart it.
	// if ( g_warmup.modificationCount != level.warmupModificationCount ) {
	// 	level.warmupModificationCount = g_warmup.modificationCount;
	// 	level.warmupTime = -1;
	// }

	// If all players have arrived, start the countdown.
	if (match.warmupTime < 0) {
		// Fudge by -1 to account for extra delays.
		var warmupTime = 0;
		if (g_warmup() > 1) {
			warmupTime = level.time + (g_warmup() - 1) * 1000;
		}

		ChangeWarmupState(match, warmupTime);
		return;
	}

	// If the warmup time has counted down, restart.
	if (level.time > match.warmupTime) {
		if (g_gametype() === GT.CLANARENA) {
			StartMatch();
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
 * CheckMatchEnd
 */
function CheckMatchEnd(match) {
	if (g_gametype() !== GT.CLANARENA) {
		return;
	}

	if (match.warmupTime !== WARMUP_OVER) {
		return;
	}

	// Need to restart once it's time.
	if (match.restartTime) {
		if (level.time > match.restartTime) {
			RestartMatch();
		}
		return;
	}

	// End the match once one team has killed off the other.
	var counts = new Array(TEAM.NUM_TEAMS);

	counts[TEAM.RED] = TeamAliveCount(TEAM.RED, match);
	counts[TEAM.BLUE] = TeamAliveCount(TEAM.BLUE, match);

	if (!counts[TEAM.RED]) {
		EndMatch(TEAM.BLUE, match);
	} else if (!counts[TEAM.BLUE]) {
		EndMatch(TEAM.RED, match);
	}
}

/**
 * RestartMatch
 *
 * Called a few seconds after a match has ended.
 */
function RestartMatch(match) {
	log('RestartMatch');

	match.restartTime = 0;

	// Start the warmup.
	ChangeWarmupState(match, WARMUP_WAITING);

	// Cycle the queue in team-sized games.
	if (TEAM_SIZE > 0) {
		for (var i = 0; i < level.maxclients; i++) {
			var ent = level.gentities[i];
			var client = ent.client;

			if (!ent.inuse) {
				continue;
			}

			if (ent.match !== match) {
				continue;
			}

			if (client.sess.sessionTeam === TEAM.SPECTATOR) {
				continue;
			}

			if (client.sess.sessionTeam !== match.lastWinningTeam) {
				PushClientToQueue(client);
			}
		}

		PopClientsFromQueue();
	}

	// Respawn everybody.
	for (var i = 0; i < level.maxclients; i++) {
		var ent = level.gentities[i];
		var client = ent.client;

		if (!ent.inuse) {
			continue;
		}

		if (ent.match !== match) {
			continue;
		}

		if (client.sess.sessionTeam === TEAM.SPECTATOR) {
			continue;
		}

		client.sess.spectatorState = SPECTATOR.NOT;
		ClientSpawn(ent);
	}

	// Update team counts.
	CalculateRanks(ent.match);
}

/**
 * StartMatch
 *
 * Called after warmup is over.
 */
function StartMatch(match) {
	log('StartMatch');

	// Put the brakes on warmup.
	ChangeWarmupState(match, WARMUP_OVER);

	// Everybody should already have been spawned back in by RestartMatch, but
	// perhaps they've managed to kill themselves during warmup.
	SpawnDeadClients(match);
}

/**
 * EndMatch
 */
function EndMatch(match, winningTeam) {
	log('EndMatch');

	if (winningTeam !== null) {
		match.teamScores[winningTeam] += 1;
	}

	match.restartTime = level.time + 4000;
	match.lastWinningTeam = winningTeam;
}

/**
 * SpawnDeadClients
 */
function SpawnDeadClients(match) {
	for (var i = 0; i < level.maxclients; i++) {
		var ent = level.gentities[i];
		var client = ent.client;

		if (!ent.inuse) {
			continue;
		}

		if (ent.match !== match) {
			continue;
		}

		if (client.sess.sessionTeam === TEAM.SPECTATOR) {
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
function PopClientsFromQueue(match) {
	var clientsNeeded = 2;
	if (g_gametype >= GT.TEAM) {
		clientsNeeded = TEAM_SIZE * 2;
	}

	while (match.numPlayingClients < clientsNeeded) {
		var nextInLine;

		for (var i = 0; i < level.maxclients; i++) {
			var ent = level.gentities[i];
			var client = ent.client;

			if (!ent.inuse) {
				continue;
			}

			if (ent.match !== match) {
				continue;
			}

			if (client.sess.sessionTeam !== TEAM.SPECTATOR) {
				continue;
			}

			// Never select the dedicated follow or scoreboard clients.
			if (client.sess.spectatorState === SPECTATOR.SCOREBOARD ||
				client.sess.spectatorClient < 0 ||
				client.sess.spectatorNum === -1) {
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

	ChangeWarmupState(match, WARMUP_WAITING);
}

/**
 * PushClientToQueue
 *
 * Add client to end of the queue.
 */
function PushClientToQueue(match, client) {
	log('Pushing client', client.ps.clientNum, 'to end of queue');

	if (client.sess.sessionTeam !== TEAM.SPECTATOR) {
		SetTeam(client, 's');
	}

	for (var i = 0; i < level.maxclients; i++) {
		var ent = level.gentities[i];
		var curclient = ent.client;

		if (!ent.inuse) {
			break;
		}

		if (ent.match !== match) {
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
 * team change and match restart.
 */
function CalculateRanks(match) {
	var rank;
	var score;
	var newScore;

	// match.follow1 = -1;
	// match.follow2 = -1;
	match.numConnectedClients = 0;
	match.numNonSpectatorClients = 0;
	match.numPlayingClients = 0;
	match.numVotingClients = 0;		// don't count bots

	// for (var i = 0; i < match.numteamVotingClients.length; i++) {
	// 	match.numteamVotingClients[i] = 0;
	// }

	for (var i = 0; i < level.maxclients; i++) {
		if (level.clients[i].pers.connected !== CON.DISCONNECTED) {
			match.sortedClients[match.numConnectedClients] = i;
			match.numConnectedClients += 1;

			if (level.clients[i].sess.sessionTeam !== TEAM.SPECTATOR) {
				match.numNonSpectatorClients += 1;

				// Decide if this should be auto-followed.
				if (level.clients[i].pers.connected === CON.CONNECTED) {
					match.numPlayingClients += 1;

					match.numVotingClients += 1;

					// if (level.clients[i].sess.sessionTeam == TEAM.RED) {
					// 	match.numteamVotingClients[0] += 1;
					// } else if (level.clients[i].sess.sessionTeam == TEAM.BLUE) {
					// 	match.numteamVotingClients[1] += 1;
					// }

					// if (match.follow1 === -1) {
					// 	match.follow1 = i;
					// } else if (match.follow2 === -1) {
					// 	match.follow2 = i;
					// }
				}
			}
		}
	}

// 	qsort( level.sortedClients, level.numConnectedClients, sizeof(level.sortedClients[0]), SortRanks );
	match.sortedClients.sort(SortRanks);

	// Set the rank value for all clients that are connected and not spectators.
	if (g_gametype() >= GT.TEAM) {
		// In team games, rank is just the order of the teams, 0=red, 1=blue, 2=tied.
		for (var i = 0; i < match.numConnectedClients; i++) {
			var client = level.clients[match.sortedClients[i]];

			if (match.teamScores[TEAM.RED] === match.teamScores[TEAM.BLUE]) {
				client.ps.persistant[PERS.RANK] = 2;
			} else if (match.teamScores[TEAM.RED] > match.teamScores[TEAM.BLUE]) {
				client.ps.persistant[PERS.RANK] = 0;
			} else {
				client.ps.persistant[PERS.RANK] = 1;
			}
		}
	} else {
		rank = -1;
		score = 0;
		for (var i = 0; i < match.numPlayingClients; i++) {
			var client = level.clients[match.sortedClients[i]];

			newScore = client.ps.persistant[PERS.SCORE];

			if (i === 0 || newScore !== score) {
				rank = i;
				// Assume we aren't tied until the next client is checked.
				level.clients[match.sortedClients[i]].ps.persistant[PERS.RANK] = rank;
			} else {
				// We are tied with the previous client.
				level.clients[match.sortedClients[i - 1]].ps.persistant[PERS.RANK] = rank | RANK_TIED_FLAG;
				level.clients[match.sortedClients[i    ]].ps.persistant[PERS.RANK] = rank | RANK_TIED_FLAG;
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
			count1 = TeamCount(TEAM.RED, match, null);
			count2 = TeamCount(TEAM.BLUE, match, null);
		}

		sv.SetConfigstring('score1', { s: match.teamScores[TEAM.RED],  c: count1 });
		sv.SetConfigstring('score2', { s: match.teamScores[TEAM.BLUE], c: count2 });
	} else {
		var n1 = match.sortedClients[0];
		var n2 = match.sortedClients[1];

		if (match.numConnectedClients === 0) {
			sv.SetConfigstring('score1', { s: SCORE_NOT_PRESENT });
			sv.SetConfigstring('score2', { s: SCORE_NOT_PRESENT });
		} else if (match.numConnectedClients === 1) {
			sv.SetConfigstring('score1', { s: level.clients[n1].ps.persistant[PERS.SCORE], n: n1 });
			sv.SetConfigstring('score2', { s: SCORE_NOT_PRESENT });
		} else {
			sv.SetConfigstring('score1', { s: level.clients[n1].ps.persistant[PERS.SCORE], n: n1 });
			sv.SetConfigstring('score2', { s: level.clients[n2].ps.persistant[PERS.SCORE], n: n2 });
		}
	}

	// See if it is time to end the level.
	// CheckExitRules();

	// If we are at the intermission, send the new info to everyone.
	if (level.intermissiontime) {
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

/**
 * PickTeam
 */
function PickTeam(match) {
	var team;

	if (g_gametype() >= GT.TEAM) {
		// Always TEAM.FREE in lobby of CA.
		if (g_gametype() === GT.CLANARENA && match.arena === 0) {
			team = TEAM.FREE;
		} else {
			// Find the team with the least amount of players.
			var counts = new Array(TEAM.NUM_TEAMS);

			counts[TEAM.BLUE] = TeamCount(TEAM.BLUE, match, null);
			counts[TEAM.RED] = TeamCount(TEAM.RED, match, null);

			if (counts[TEAM.BLUE] > counts[TEAM.RED]) {
				team = TEAM.RED;
			} else if (counts[TEAM.RED] > counts[TEAM.BLUE]) {
				team = TEAM.BLUE;
			}
			// Equal team count, so join the team with the lowest score.
			else if (match.teamScores[TEAM.BLUE] > match.teamScores[TEAM.RED]) {
				team = TEAM.RED;
			} else {
				team = TEAM.BLUE;
			}
		}
	} else {
		team = TEAM.FREE;
	}

	// Override decision if limiting the players.
	if (g_gametype() === GT.TOURNAMENT && match.numNonSpectatorClients >= 2) {
		team = TEAM.SPECTATOR;
	} else if (g_gametype() === GT.CLANARENA && TEAM_SIZE && match.numNonSpectatorClients >= TEAM_SIZE*2) {
		team = TEAM.SPECTATOR;
	} else if (g_maxGameClients() > 0 && match.numNonSpectatorClients >= g_maxGameClients()) {
		team = TEAM.SPECTATOR;
	}

	log('PickTeam', match.numNonSpectatorClients, team);

	return team;
}

/**
 * TeamCount
 *
 * Returns number of players on a team
 */
function TeamCount(team, match, ignoreClientNum) {
	var count = 0;

	for (var i = 0; i < level.maxclients; i++) {
		var ent = level.gentities[i];
		var client = level.clients[i];

		if (i === ignoreClientNum) {
			continue;
		}

		if (!ent.inuse) {
			continue;
		}

		if (ent.match !== match) {
			continue;
		}

		if (client.sess.sessionTeam === team) {
			count++;
		}
	}

	return count;
}

/**
 * TeamAliveCount
 */
function TeamAliveCount(team, match) {
	var count = 0;

	for (var i = 0; i < level.maxclients; i++) {
		var ent = level.gentities[i];
		var client = level.clients[i];

		if (!ent.inuse) {
			continue;
		}

		if (ent.match !== match) {
			continue;
		}

		// In CA mode, players are kicked to SPECTATOR.FREE on death,
		// however, while playing their death animation they'll still
		// be SPECTATOR.NOT, so check ps.pm_type as well.
		// FIXME Use a teamstate enum value or something?
		if (client.sess.sessionTeam === team &&
		    (client.sess.spectatorState === SPECTATOR.NOT && client.ps.pm_type !== PM.DEAD)) {
			count++;
		}
	}

	return count;
}