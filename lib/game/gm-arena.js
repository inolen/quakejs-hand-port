/**
 * InitArenas
 */
function InitArenas() {
	var arenas = [
		'default'
	];

	// Store off arena names from the intermission points.
	// NOTE This is only used by old school RA3 maps for now.
	var entityDefs = SV.GetEntityDefs();

	for (var i = 0; i < entityDefs.length; i++) {
		var def = entityDefs[i];

		if (def.classname === 'info_player_intermission') {
			var num = parseInt(def.arena, 10);

			if (isNaN(num)) {
				continue;
			}

			if (arenas[num] !== undefined) {
				continue;
			}

			// Store off the name.
			arenas[num] = def.message;

			// If we found a explicit arena definition, flag this as a
			// rocketarena level.
			level.rocketarena = true;
		}
	}

	for (var i = 0; i < arenas.length; i++) {
		var arena = new ArenaInfo();

		arena.arenaNum = i;
		arena.name = arenas[i];

		// Set current arena for entity spawning purposes.
		level.arena = level.arenas[i] = arena;

		// FIXME We don't really need to spawn all map entities for each arena,
		// especially static, stateless ones such as triggers and what not.
		SpawnAllEntitiesFromDefs(i);

		//
		if (g_gametype.getAsInt() === GT.TOURNAMENT) {
			CreateTournamentMachine();
		} else if (g_gametype.getAsInt() === GT.CLANARENA) {
			CreateRoundMachine();
		}
	}

	// // Make sure we have flags for CTF, etc.
	// if (g_gametype.getAsInt() >= GT.TEAM) {
	// 	Team_CheckItems();
	// }
}

/**
 * ArenaInfoChanged
 *
 * FIXME Don't send so much info on each update?
 */
function ArenaInfoChanged() {
	var info = {
		'name': level.arena.name,
		'fl': g_fraglimit.at(level.arena.arenaNum).getAsInt(),
		'cl': g_capturelimit.at(level.arena.arenaNum).getAsInt(),
		'ppt': g_playersPerTeam.at(level.arena.arenaNum).getAsInt(),
		'nc': level.arena.numConnectedClients,
		'gs': level.arena.state.current,
		'wt': level.arena.warmupTime
	};

	SV.SetConfigstring('arena' + level.arena.arenaNum, info);

	for (var i = 0; i < MAX_CLIENTS; i++) {
		// var ti = level.arena.teams[i];
		TeamInfoChanged(i);
	}

	// This is not the userinfo, more like the configstring actually.
	log('ArenaInfoChanged: ' + level.arena.arenaNum + ' ' + JSON.stringify(info));
}

/**
 * TeamInfoChanged
 */
function TeamInfoChanged(teamNum) {
	var team = level.arena.teams[teamNum];

	var info = {
		'score': team.score,
		'count': team.count,
		'alive': team.alive,
		'extra': team.extra
	};

	SV.SetConfigstring('team' + teamNum, info);
}

/**
 * RunArenas
 */
function RunArenas() {
	// Update infostrings if anything has been changed.
	if (Cvar.Modified(QS.CVAR.ARENAINFO)) {
		ArenaInfoChanged();
		Cvar.ClearModified(QS.CVAR.ARENAINFO);
	}

	// Run the gameplay logic for each arena.
	for (var i = 0; i < level.arenas.length; i++) {
		level.arena = level.arenas[i];

		// Run the frame callback for the state machine.
		if (level.arena.state) {
			level.arena.state.frame();
		}

		// // See if the match is over.
		// CheckMatchRules();
	}
}

/**
 * ArenaCount
 */
function ArenaCount(ignoreClientNum) {
	var numAlive = 0;

	for (var i = 0; i < level.maxclients; i++) {
		if (i === ignoreClientNum) {
			continue;
		}

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

		numAlive++;
	}

	return numAlive;
}

/**
 * IsLobbyArena
 */
function IsLobbyArena() {
	if (!level.rocketarena) {
		return false;
	}

	return (level.arena.arenaNum === 0);
}

/**********************************************************
 *
 * Tournament
 *
 **********************************************************/

/**
 * CreateTournamentMachine
 */
function CreateTournamentMachine() {
	level.arena.state = StateMachine.create({
		initial: {
			event: 'wait',
			state: GS.WAITING,
			defer: true
		},
		events: [
			{ name: 'wait',  from: ['none', GS.COUNTDOWN, GS.ACTIVE], to: GS.WAITING },
			{ name: 'ready', from: GS.WAITING,                        to: GS.COUNTDOWN },
			{ name: 'start', from: GS.COUNTDOWN,                      to: GS.ACTIVE    }
		],
		callbacks: {
			onwait: function (event, from, to, msg) {
				ArenaInfoChanged();
			},
			onready: function (event, from, to, msg) {
				TournamentWarmup();
				ArenaInfoChanged();
			},
			onstart: function (event, from, to, msg) {
				TournamentStart();
				ArenaInfoChanged();
			}
		}
	});

	// Callback for the game to run each frame.
	level.arena.state.frame = CheckTournamentRules;

	// Fire initial state change.
	level.arena.state.wait();
}

/**
 * CheckTournamentRules
 */
function CheckTournamentRules() {
	var state = level.arena.state;

	if (state.current === GS.WAITING) {
		while (true) {
			if (level.arena.numPlayingClients >= 2) {
				state.ready();
				return;
			}

			// Try to pull a client from the queue if we don't have enough.
			var next = PopClientFromQueue();
			if (!next) {
				break;
			}

			SetTeam(next.client, 'f', false);
		}
	} else if (state.current === GS.COUNTDOWN) {
		// If we don't have two players, go back to "waiting for players".
		if (level.arena.numPlayingClients !== 2) {
			state.wait();
			return;
		}

		if (level.time > level.arena.warmupTime) {
			state.start();
		}
	} else if (state.current === GS.ACTIVE) {
		if (level.arena.numPlayingClients !== 2) {
			state.wait();
			return;
		}
	}
}

/**
 * TournamentWarmup
 */
function TournamentWarmup() {
	log('TournamentWarmup');

	// Fudge by -1 to account for extra delays.
	level.arena.warmupTime = 0;

	if (g_warmup.getAsInt() > 1) {
		level.arena.warmupTime = level.time + (g_warmup.getAsInt() - 1) * 1000;
	}
}

/**
 * TournamentStart
 *
 * Called after warmup is over.
 */
function TournamentStart() {
	log('StartRound');

	// AP - map_restart is lame, we should avoid it as we want to
	// support multi-arena for tournaments.
	// COM.ExecuteBuffer('map_restart 0');

	// Respawn everybody.
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

		ClientSpawn(ent);
	}

	// FIXME reset scores.

	// FIXME clear out gentities.
}

/**********************************************************
 *
 * Rounds
 *
 **********************************************************/

/**
 * CreateRoundMachine
 */
function CreateRoundMachine() {
	level.arena.state = StateMachine.create({
		initial: {
			event: 'wait',
			state: GS.WAITING,
			defer: true
		},
		events: [
			{ name: 'ready',   from: GS.WAITING,   to: GS.COUNTDOWN },
			{ name: 'start',   from: GS.COUNTDOWN, to: GS.ACTIVE    },
			{ name: 'end',     from: GS.ACTIVE,    to: GS.OVER      },
			{ name: 'restart', from: GS.OVER,      to: GS.WAITING   }
		],
		callbacks: {
			onwait: function (event, from, to, msg) {
				ArenaInfoChanged();
			},
			onready: function (event, from, to, msg) {
				RoundWarmup();
				ArenaInfoChanged();
			},
			onstart: function (event, from, to, msg) {
				RoundStart();
				ArenaInfoChanged();
			},
			onend: function (event, from, to, msg) {
				RoundEnd(msg);
				ArenaInfoChanged();
			},
			onrestart: function (event, from, to, msg) {
				RoundRestart();
				ArenaInfoChanged();
			}
		}
	});

	// Callback for the game to run each frame.
	level.arena.state.frame = CheckRoundRules;

	// Fire initial state change.
	level.arena.state.wait();
}

/**
 * CheckRoundRules
 */
function CheckRoundRules() {
	var state = level.arena.state;

	var counts = new Array(TEAM.NUM_TEAMS);
	counts[TEAM.BLUE] = TeamCount(TEAM.BLUE, ENTITYNUM_NONE);
	counts[TEAM.RED] = TeamCount(TEAM.RED, ENTITYNUM_NONE);

	var enough = true;
	if (counts[TEAM.RED] < 1 || counts[TEAM.BLUE] < 1) {
		enough = false;
	}

	if (state.current === GS.WAITING) {
		if (enough) {
			state.ready();
		}
	} else if (state.current === GS.COUNTDOWN) {
		if (level.time > level.arena.warmupTime) {
			state.start();
		}
	} else if (state.current === GS.ACTIVE) {
		if (IsLobbyArena()) {
			return;
		}

		counts[TEAM.RED] = TeamAliveCount(TEAM.RED);
		counts[TEAM.BLUE] = TeamAliveCount(TEAM.BLUE);

		if (!counts[TEAM.RED] && !counts[TEAM.BLUE]) {
			state.end(null);
		} else if (!counts[TEAM.RED]) {
			state.end(TEAM.BLUE);
		} else if (!counts[TEAM.BLUE]) {
			state.end(TEAM.RED);
		}
	} else if (state.current === GS.OVER) {
		// Need to restart once it's time.
		if (level.time > level.arena.restartTime) {
			state.restart();
		}
	}
}

/**
 * RoundWarmup
 */
function RoundWarmup() {
	log('RoundWarmup');

	// Fudge by -1 to account for extra delays.
	level.arena.warmupTime = 0;

	if (g_warmup.getAsInt() > 1) {
		level.arena.warmupTime = level.time + (g_warmup.getAsInt() - 1) * 1000;
	}
}

/**
 * RoundStart
 *
 * Called after warmup is over.
 */
function RoundStart() {
	log('RoundStart');

	// TODO Make sure everyone is alive.
}

/**
 * RoundEnd
 */
function RoundEnd(winningTeam) {
	log('RoundEnd', winningTeam);

	if (winningTeam !== null) {
		level.arena.teams[winningTeam].score += 1;
	}
	level.arena.restartTime = level.time + 4000;
	level.arena.lastWinningTeam = winningTeam;
}

/**
 * RoundRestart
 *
 * Called a few seconds after a round has ended.
 */
function RoundRestart() {
	var playersPerTeam = g_playersPerTeam.at(level.arena.arenaNum).getAsInt();

	log('RoundRestart');

	level.arena.restartTime = 0;

	// Respawn everybody, queuing losers.
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

		// No longer eliminated.
		ent.client.pers.teamState.state = TEAM_STATE.BEGIN;

		// In non-pickup games, queue losers as specs.
		if (playersPerTeam > 0 && ent.client.sess.sessionTeam !== level.arena.lastWinningTeam) {
			SetTeam(ent.client, 's', true);
			PushClientToQueue(ent);
			continue;
		}

		ClientSpawn(ent);
	}

	// Finally, spawn in the next wave of players.
	while (true) {
		if (playersPerTeam && ArenaCount() >= playersPerTeam*2) {
			break;
		}

		var next = PopClientFromQueue();
		if (!next) {
			break;
		}

		// No longer eliminated.
		next.client.pers.teamState.state = TEAM_STATE.BEGIN;

		// In non-pickup games, the client's go to spec when queued,
		// so we need to place them on the appropriate team.
		if (next.client.sess.sessionTeam === TEAM.SPECTATOR) {
			SetTeam(next.client, 'f', true);
			continue;
		}

		ClientSpawn(next);
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

	// if (g_timelimit.getAsInt() && level.warmupTime === WARMUP_OVER) {
	// 	if (level.time - level.startTime >= g_timelimit.getAsInt() * 60000) {
	// 		SV.SendServerCommand(null, 'print', 'Timelimit hit.');
	// 		QueueIntermission();
	// 		return;
	// 	}
	// }

	// if (g_gametype.getAsInt() < GT.CTF && g_fraglimit.getAsInt()) {
	// 	if (level.teams[TEAM.RED].score >= g_fraglimit.getAsInt()) {
	// 		SV.SendServerCommand(null, 'print', 'Red hit the fraglimit.');
	// 		QueueIntermission();
	// 		return;
	// 	}

	// 	if (level.teams[TEAM.BLUE].score >= g_fraglimit.getAsInt()) {
	// 		SV.SendServerCommand(null, 'print', 'Blue hit the fraglimit.');
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

	// 		if (client.ps.persistant[PERS.SCORE] >= g_fraglimit.getAsInt()) {
	// 			SV.SendServerCommand(null, client.pers.netname + ' hit the fraglimit.');
	// 			QueueIntermission();
	// 			return;
	// 		}
	// 	}
	// }

	// if (g_gametype.getAsInt() >= GT.CTF && g_gametype.getAsInt() !== GT.CLANARENA && g_capturelimit.getAsInt()) {
	// 	if (level.teams[TEAM.RED].score >= g_capturelimit.getAsInt()) {
	// 		SV.SendServerCommand(null, 'print', 'Red hit the capturelimit.');
	// 		QueueIntermission();
	// 		return;
	// 	}

	// 	if (level.teams[TEAM.BLUE].score >= g_capturelimit.getAsInt()) {
	// 		SV.SendServerCommand(null, 'print', 'Blue hit the capturelimit.');
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

	if (g_gametype.getAsInt() >= GT.TEAM) {
		return (level.arena.teams[TEAM.RED].score === level.arena.teams[TEAM.BLUE].score);
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
 */
function PopClientFromQueue() {
	var nextInLine = null;

	for (var i = 0; i < level.maxclients; i++) {
		var ent = level.gentities[i];

		if (!ent.inuse) {
			continue;
		}

		if (ent.s.arenaNum !== level.arena.arenaNum) {
			continue;
		}

		if (ent.client.sess.sessionTeam !== TEAM.SPECTATOR) {
			continue;
		}

		if (ent.client.sess.spectatorNum === -1) {
			continue;
		}

		if (!nextInLine || ent.client.sess.spectatorNum > nextInLine.client.sess.spectatorNum) {
			nextInLine = ent;
		}
	}

	if (!nextInLine) {
		return null;
	}

	log('Popping client', nextInLine.client.ps.clientNum, 'from end of queue');

	nextInLine.client.sess.spectatorNum = -1;

	return nextInLine;
}

/**
 * PushClientToQueue
 *
 * Add client to end of the queue.
 */
function PushClientToQueue(ent) {
	var client = ent.client;

	log('Pushing client', client.ps.clientNum, 'to beginning of queue');

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
 * RemoveClientFromQueue
 */
function RemoveClientFromQueue(ent) {
	log('RemoveClientFromQueue', ent.client.ps.clientNum);
	ent.client.sess.spectatorNum = -1;
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
	SV.SetConfigstring('intermission', 1);
}

/**
 * BeginIntermission
 */
function BeginIntermission() {
	if (level.intermissiontime) {
		return;  // already active
	}

	// If in tournement mode, change the wins / losses.
	if (g_gametype.getAsInt() === GT.TOURNAMENT) {
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
// 	if (g_gametype.getAsInt() == GT.TOURNAMENT ) {
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
	// level.teams[TEAM.RED].score = 0;
	// level.teams[TEAM.BLUE].score = 0;

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

		if (ent.client.pers.connected === CON.DISCONNECTED) {
			continue;
		}

		level.arena.sortedClients[level.arena.numConnectedClients] = i;
		level.arena.numConnectedClients++;

		if (ent.client.sess.sessionTeam !== TEAM.SPECTATOR) {
			level.arena.numNonSpectatorClients++;

			// Decide if this should be auto-followed.
			if (ent.client.pers.connected === CON.CONNECTED) {
				level.arena.numPlayingClients++;

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
	if (g_gametype.getAsInt() >= GT.TEAM) {
		// In team games, rank is just the order of the teams, 0=red, 1=blue, 2=tied.
		for (var i = 0; i < level.arena.numPlayingClients; i++) {
			var client = level.clients[level.arena.sortedClients[i]];

			if (level.arena.teams[TEAM.RED].score === level.arena.teams[TEAM.BLUE].score) {
				client.ps.persistant[PERS.RANK] = 2;
			} else if (level.arena.teams[TEAM.RED].score > level.arena.teams[TEAM.BLUE].score) {
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
	if (g_gametype.getAsInt() >= GT.TEAM) {
		level.arena.teams[TEAM.RED].count = TeamCount(TEAM.RED, ENTITYNUM_NONE);
		level.arena.teams[TEAM.BLUE].count = TeamCount(TEAM.BLUE, ENTITYNUM_NONE);

		level.arena.teams[TEAM.RED].alive = TeamAliveCount(TEAM.RED);
		level.arena.teams[TEAM.BLUE].alive = TeamAliveCount(TEAM.BLUE);
	} else {
		var n1 = level.arena.sortedClients[0];
		var n2 = level.arena.sortedClients[1];

		if (level.arena.numConnectedClients === 0) {
			level.arena.teams[0].score = SCORE_NOT_PRESENT;
			level.arena.teams[0].extra = ENTITYNUM_NONE;

			level.arena.teams[1].score = SCORE_NOT_PRESENT;
			level.arena.teams[1].extra = ENTITYNUM_NONE;
		} else if (level.arena.numConnectedClients === 1) {
			level.arena.teams[0].score = level.clients[n1].ps.persistant[PERS.SCORE];
			level.arena.teams[0].extra = n1;

			level.arena.teams[1].score = SCORE_NOT_PRESENT;
			level.arena.teams[1].extra = ENTITYNUM_NONE;
		} else {
			level.arena.teams[0].score = level.clients[n1].ps.persistant[PERS.SCORE];
			level.arena.teams[0].extra = n1;

			level.arena.teams[1].score = level.clients[n2].ps.persistant[PERS.SCORE];
			level.arena.teams[1].extra = n2;
		}
	}

	ArenaInfoChanged();

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