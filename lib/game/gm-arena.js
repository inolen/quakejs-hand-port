/**
 * ChangeWarmupState
 */
function ChangeWarmupState(warmupTime) {
	if (level.warmupTime === warmupTime) {
		return;
	}

	level.warmupTime = warmupTime;
	sv.SetConfigstring('warmup', level.warmupTime);

	// In CA, spawn back in dead clients when we re-enter warmup.
	if (g_gametype() === GT.CLANARENA && level.warmupTime === WARMUP_WAITING) {
		SpawnDeadClients();
	}
}

/**
 * CheckWarmup
 */
function CheckWarmup() {
	// Check because we run 3 game frames before calling Connect and/or ClientBegin
	// for clients on a map_restart.
	if (level.numPlayingClients === 0) {
		return;
	}

	if (g_gametype() === GT.TOURNAMENT) {
		// Pull in a spectator if needed.
		PopClientsFromQueue();

		// If we don't have two players, go back to "waiting for players".
		if (level.numPlayingClients !== 2) {
			ChangeWarmupState(WARMUP_WAITING);
			return;
		}

		if (level.warmupTime === WARMUP_OVER) {
			return;
		}

		// // If the warmup is changed at the console, restart it.
		// if ( g_warmup.modificationCount != level.warmupModificationCount ) {
		// 	level.warmupModificationCount = g_warmup.modificationCount;
		// 	level.warmupTime = -1;
		// }

		// If all players have arrived, start the countdown.
		if (level.warmupTime < 0) {
			if (level.numPlayingClients === 2) {
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
		if (level.time > level.warmupTime) {
			level.restarted = true;
			gms.warmupDisabled = true;
			com.ExecuteBuffer('map_restart 0');
			return;
		}
	} else if (g_gametype() >= GT.TEAM) {
		var counts = new Array(TEAM.NUM_TEAMS);
		var notEnough = false;

		if (g_gametype() > GT.TEAM) {
			counts[TEAM.BLUE] = TeamCount(TEAM.BLUE, null);
			counts[TEAM.RED] = TeamCount(TEAM.RED, null);

			if (counts[TEAM.RED] < 1 || counts[TEAM.BLUE] < 1) {
				notEnough = true;
			}
		} else if (level.numPlayingClients < 2) {
			notEnough = true;
		}

		if (notEnough) {
			ChangeWarmupState(WARMUP_WAITING);
			return;  // still waiting for team members
		}

		if (level.warmupTime === WARMUP_OVER) {
			return;
		}

		// // If the warmup is changed at the console, restart it.
		// if ( g_warmup.modificationCount != level.warmupModificationCount ) {
		// 	level.warmupModificationCount = g_warmup.modificationCount;
		// 	level.warmupTime = -1;
		// }

		// If all players have arrived, start the countdown.
		if (level.warmupTime < 0) {
			// Fudge by -1 to account for extra delays.
			var warmupTime = 0;
			if (g_warmup() > 1) {
				warmupTime = level.time + (g_warmup() - 1) * 1000;
			}

			ChangeWarmupState(warmupTime);
			return;
		}

		// If the warmup time has counted down, restart.
		if (level.time > level.warmupTime) {
			if (g_gametype() === GT.CLANARENA) {
				StartMatch();
			} else {
				// Non-CA games do a full map_restart once warmup is over.
				level.restarted = true;
				gms.warmupDisabled = true;
				com.ExecuteBuffer('map_restart 0');
			}
			return;
		}
	}
}

/**********************************************************
 *
 * Clan Arena match rules
 *
 **********************************************************/

/**
 * CheckMatchRules
 */
function CheckMatchRules() {
	if (g_gametype() !== GT.CLANARENA) {
		return;
	}

	if (level.warmupTime !== WARMUP_OVER) {
		return;
	}

	// Need to restart once it's time.
	if (level.matchRestartTime) {
		if (level.time > level.matchRestartTime) {
			RestartMatch();
		}
		return;
	}

	// End the match once one team has killed off the other.
	var counts = new Array(TEAM.NUM_TEAMS);

	counts[TEAM.RED] = TeamAliveCount(TEAM.RED);
	counts[TEAM.BLUE] = TeamAliveCount(TEAM.BLUE);

	if (!counts[TEAM.RED]) {
		EndMatch(TEAM.BLUE);
	} else if (!counts[TEAM.BLUE]) {
		EndMatch(TEAM.RED);
	}
}

/**
 * RestartMatch
 *
 * Called a few seconds after a match has ended.
 */
function RestartMatch() {
	log('RestartMatch');

	level.matchRestartTime = 0;

	// Start the warmup.
	ChangeWarmupState(WARMUP_WAITING);

	// Cycle the queue in team-sized games.
	if (TEAM_SIZE > 0) {
		for (var i = 0; i < level.maxclients; i++) {
			var ent = level.gentities[i];
			var client = ent.client;

			if (!ent.inuse) {
				continue;
			}

			if (client.sess.sessionTeam === TEAM.SPECTATOR) {
				continue;
			}

			if (client.sess.sessionTeam !== level.matchWinningTeam) {
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

		if (client.sess.sessionTeam === TEAM.SPECTATOR) {
			continue;
		}

		client.sess.spectatorState = SPECTATOR.NOT;
		ClientSpawn(ent);
	}

	// Update team counts.
	CalculateRanks();
}

/**
 * StartMatch
 *
 * Called after warmup is over.
 */
function StartMatch() {
	log('StartMatch');

	// Put the brakes on warmup.
	ChangeWarmupState(WARMUP_OVER);

	// Everybody should already have been spawned back in by RestartMatch, but
	// perhaps they've managed to kill themselves during warmup.
	SpawnDeadClients();
}

/**
 * EndMatch
 */
function EndMatch(winningTeam) {
	log('EndMatch');

	if (winningTeam !== null) {
		level.teamScores[winningTeam] += 1;
	}

	level.matchRestartTime = level.time + 4000;
	level.matchWinningTeam = winningTeam;
}

/**
 * SpawnDeadClients
 */
function SpawnDeadClients() {
	for (var i = 0; i < level.maxclients; i++) {
		var ent = level.gentities[i];
		var client = ent.client;

		if (!ent.inuse) {
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
function PopClientsFromQueue() {
	var clientsNeeded = 2;
	if (g_gametype >= GT.TEAM) {
		clientsNeeded = TEAM_SIZE * 2;
	}

	// Never change during intermission.
	if (level.intermissiontime) {
		return;
	}

	while (level.numPlayingClients < clientsNeeded) {
		var nextInLine;

		for (var i = 0; i < level.maxclients; i++) {
			var ent = level.gentities[i];
			var client = ent.client;

			if (!ent.inuse) {
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

	ChangeWarmupState(WARMUP_WAITING);
}

/**
 * PushClientToQueue
 *
 * Add client to end of the queue.
 */
function PushClientToQueue(client) {
	log('Pushing client', client.ps.clientNum, 'to end of queue');

	if (client.sess.sessionTeam !== TEAM.SPECTATOR) {
		SetTeam(client, 's');
	}

	for (var i = 0; i < level.maxclients; i++) {
		var curclient = level.clients[i];

		if (curclient.pers.connected === CON.DISCONNECTED) {
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
function CalculateRanks() {
	var rank;
	var score;
	var newScore;

	level.follow1 = -1;
	level.follow2 = -1;
	level.numConnectedClients = 0;
	level.numNonSpectatorClients = 0;
	level.numPlayingClients = 0;
	level.numVotingClients = 0;		// don't count bots

	for (var i = 0; i < level.numteamVotingClients.length; i++) {
		level.numteamVotingClients[i] = 0;
	}

	for (var i = 0; i < level.maxclients; i++) {
		if (level.clients[i].pers.connected !== CON.DISCONNECTED) {
			level.sortedClients[level.numConnectedClients] = i;
			level.numConnectedClients += 1;

			if (level.clients[i].sess.sessionTeam !== TEAM.SPECTATOR) {
				level.numNonSpectatorClients += 1;

				// Decide if this should be auto-followed.
				if (level.clients[i].pers.connected === CON.CONNECTED) {
					level.numPlayingClients += 1;
					if (!(level.gentities[i].svFlags & SVF.BOT)) {
						level.numVotingClients += 1;
						if (level.clients[i].sess.sessionTeam == TEAM.RED) {
							level.numteamVotingClients[0] += 1;
						} else if (level.clients[i].sess.sessionTeam == TEAM.BLUE) {
							level.numteamVotingClients[1] += 1;
						}
					}
					if (level.follow1 === -1) {
						level.follow1 = i;
					} else if (level.follow2 === -1) {
						level.follow2 = i;
					}
				}
			}
		}
	}

// 	qsort( level.sortedClients, level.numConnectedClients, sizeof(level.sortedClients[0]), SortRanks );
	level.sortedClients.sort(SortRanks);

	// Set the rank value for all clients that are connected and not spectators.
	if (g_gametype() >= GT.TEAM) {
		// In team games, rank is just the order of the teams, 0=red, 1=blue, 2=tied.
		for (var i = 0; i < level.numConnectedClients; i++) {
			var client = level.clients[level.sortedClients[i]];

			if (level.teamScores[TEAM.RED] === level.teamScores[TEAM.BLUE]) {
				client.ps.persistant[PERS.RANK] = 2;
			} else if (level.teamScores[TEAM.RED] > level.teamScores[TEAM.BLUE]) {
				client.ps.persistant[PERS.RANK] = 0;
			} else {
				client.ps.persistant[PERS.RANK] = 1;
			}
		}
	} else {
		rank = -1;
		score = 0;
		for (var i = 0; i < level.numPlayingClients; i++) {
			var client = level.clients[level.sortedClients[i]];

			newScore = client.ps.persistant[PERS.SCORE];

			if (i === 0 || newScore !== score) {
				rank = i;
				// Assume we aren't tied until the next client is checked.
				level.clients[level.sortedClients[i]].ps.persistant[PERS.RANK] = rank;
			} else {
				// We are tied with the previous client.
				level.clients[level.sortedClients[i - 1]].ps.persistant[PERS.RANK] = rank | RANK_TIED_FLAG;
				level.clients[level.sortedClients[i    ]].ps.persistant[PERS.RANK] = rank | RANK_TIED_FLAG;
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
			count1 = TeamCount(TEAM.RED, null);
			count2 = TeamCount(TEAM.BLUE, null);
		}

		sv.SetConfigstring('score1', { s: level.teamScores[TEAM.RED],  c: count1 });
		sv.SetConfigstring('score2', { s: level.teamScores[TEAM.BLUE], c: count2 });
	} else {
		var n1 = level.sortedClients[0];
		var n2 = level.sortedClients[1];

		if (level.numConnectedClients === 0) {
			sv.SetConfigstring('score1', { s: SCORE_NOT_PRESENT });
			sv.SetConfigstring('score2', { s: SCORE_NOT_PRESENT });
		} else if (level.numConnectedClients === 1) {
			sv.SetConfigstring('score1', { s: level.clients[n1].ps.persistant[PERS.SCORE], n: n1 });
			sv.SetConfigstring('score2', { s: SCORE_NOT_PRESENT });
		} else {
			sv.SetConfigstring('score1', { s: level.clients[n1].ps.persistant[PERS.SCORE], n: n1 });
			sv.SetConfigstring('score2', { s: level.clients[n2].ps.persistant[PERS.SCORE], n: n2 });
		}
	}

	// See if it is time to end the level.
	CheckExitRules();
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