/**
 * ClientCommand
 */
function ClientCommand(clientNum, cmd) {
	var ent = level.gentities[clientNum];
	if (!ent.client || ent.client.pers.connected !== CON.CONNECTED) {
		return;  // not fully in game yet
	}

	// Set the global arena.
	SetCurrentArena(ent.s.arenaNum);

	var name = cmd.type;
	var args = cmd.data;

	if (name === 'queue') {
		var arenaNum = parseInt(args[0], 10);
		console.log('---------- ARENA ' + arenaNum + ' ----------');
		console.log(level.arenas[arenaNum]);
		console.log('---------- CLIENTS ----------');
		for (var i = 0; i < level.maxclients; i++) {
			if (!level.gentities[i].inuse) return;
			if (level.gentities[i].s.arenaNum === arenaNum) {
				console.log('Client', i, level.gentities[i].client.sess);
			}
		}
	}
	else if (name === 'say') {
		ClientCmdSay(ent, SAY.ALL, args[0]);
		return;
	}
	// if (Q_stricmp (cmd, "say_team") == 0) {
	// 	Cmd_Say_f (ent, SAY_TEAM, qfalse);
	// 	return;
	// }
	// if (Q_stricmp (cmd, "tell") == 0) {
	// 	Cmd_Tell_f ( ent );
	// 	return;
	// }
	else if (name === 'score') {
		ClientCmdScore(ent);
		return;
	}

	// Ignore all other commands when at intermission.
	if (IntermissionStarted()) {
		// Cmd_Say_f (ent, qfalse, qtrue);
		return;
	}

	// if (Q_stricmp (cmd, "give") == 0)
	// 	Cmd_Give_f (ent);
	// else if (Q_stricmp (cmd, "god") == 0)
	// 	Cmd_God_f (ent);
	// else if (Q_stricmp (cmd, "notarget") == 0)
	// 	Cmd_Notarget_f (ent);
	if (name === 'noclip') {
		ClientCmdNoclip(ent);
	}
	// else if (Q_stricmp (cmd, "kill") == 0)
	// 	Cmd_Kill_f (ent);
	// else if (Q_stricmp (cmd, "teamtask") == 0)
	// 	Cmd_TeamTask_f (ent);
	// else if (Q_stricmp (cmd, "levelshot") == 0)
	// 	Cmd_LevelShot_f (ent);
	else if (name === 'follow') {
		ClientCmdFollow(ent, args[0]);
	} else if (name === 'follownext') {
		ClientCmdFollowCycle(ent, 1);
	} else if (name === 'followprev') {
		ClientCmdFollowCycle(ent, -1);
	} else if (name === 'team') {
		ClientCmdTeam(ent, args[0]);
	} else if (name === 'arena') {
		ClientCmdArena(ent, args[0]);
	// else if (Q_stricmp (cmd, "where") == 0)
	// 	Cmd_Where_f (ent);
	// else if (Q_stricmp (cmd, "callvote") == 0)
	// 	Cmd_CallVote_f (ent);
	// else if (Q_stricmp (cmd, "vote") == 0)
	// 	Cmd_Vote_f (ent);
	// else if (Q_stricmp (cmd, "callteamvote") == 0)
	// 	Cmd_CallTeamVote_f (ent);
	// else if (Q_stricmp (cmd, "teamvote") == 0)
	// 	Cmd_TeamVote_f (ent);
	// else if (Q_stricmp (cmd, "gc") == 0)
	// 	Cmd_GameCommand_f( ent );
	// else if (Q_stricmp (cmd, "setviewpos") == 0)
	// 	Cmd_SetViewpos_f( ent );
	// else if (Q_stricmp (cmd, "stats") == 0)
	// 	Cmd_Stats_f( ent );
	} else {
		SV.SendServerCommand(clientNum, 'print', 'Unknown client command \'' + name + '\'');
	}
}

/**
 * ClientCmdSay
 */
function ClientCmdSay(ent, mode, text) {
	if (!text) {
		return;
	}

	Say(ent, null, mode, text);
}

/**
 * ClientCmdFollow
 */
function ClientCmdFollow(ent, follow) {
	if (typeof(follow) === 'undefined') {
		if (ent.client.sess.spectatorState === SPECTATOR.FOLLOW) {
			StopFollowing(ent);
		}
		return;
	}

	var i = ClientNumberFromString(ent, follow);
	if (i === -1) {
		return;
	}

	// Can't follow self.
	if (level.clients[i] === ent.client) {
		return;
	}

	// Can't follow people in other arenas.
	if (level.gentities[i].s.arenaNum !== ent.s.arenaNum) {
		return;
	}

	// Can't follow another spectator.
	if (level.clients[i].sess.team === TEAM.SPECTATOR) {
		return;
	}

	// If they are playing a tournement game, count as a loss
	if (level.arena.gametype === GT.TOURNAMENT &&
		ent.client.sess.team === TEAM.FREE) {
		ent.client.sess.losses++;
	}

	// First set them to spectator.
	if (ent.client.sess.team !== TEAM.SPECTATOR) {
		SetTeam(ent, 'spectator');
	}

	ent.client.sess.spectatorState = SPECTATOR.FOLLOW;
	ent.client.sess.spectatorClient = i;
}

/**
 * ClientNumberFromString
 *
 * Returns a player number for either a number or name string
 * Returns -1 if invalid
 */
function ClientNumberFromString(to, s) {
	var id;

	// Numeric values are just slot numbers.
	id = parseInt(s, 10);
	if (!isNaN(id)) {
		if (id < 0 || id >= level.maxclients) {
			SV.SendServerCommand(to.s.number, 'print', 'Bad client slot: ' + id);
			return -1;
		}

		var cl = level.clients[id];
		if (cl.pers.connected !== CON.CONNECTED ) {
			SV.SendServerCommand(to.s.number, 'print', 'Client ' + id + ' is not active');
			return -1;
		}

		return id;
	}

	// Check for a name match
	for (id = 0; id < level.maxclients; id++) {
		var cl = level.clients[id];
		if (cl.pers.connected !== CON.CONNECTED) {
			continue;
		}

		var cleanName = QS.StripColors(cl.pers.name);

		if (cleanName === s) {
			return id;
		}
	}

	SV.SendServerCommand(to.s.number, 'print', 'User ' + s + ' is not on the server');
	return -1;
}

/**
 * StopFollowing
 *
 * If the client being followed leaves the game, or you just want to drop
 * to free floating spectator mode.
 */
function StopFollowing(ent) {
	ent.client.ps.persistant[PERS.TEAM] = TEAM.SPECTATOR;
	ent.client.sess.team = TEAM.SPECTATOR;
	ent.client.sess.spectatorState = SPECTATOR.FREE;
	ent.client.ps.pm_flags &= ~PMF.FOLLOW;
	// ent.r.svFlags &= ~SVF_BOT;
	ent.client.ps.clientNum = ent.s.number;
}

/**
 * ClientCmdFollowCycle
 */
function ClientCmdFollowCycle(ent, dir) {
	// If they are playing a tournement game, count as a loss.
	if (level.arena.gametype === GT.TOURNAMENT &&
		ent.client.sess.team === TEAM.FREE) {
		ent.client.sess.losses++;
	}

	// First set them to spectator.
	if (ent.client.sess.spectatorState === SPECTATOR.NOT) {
		SetTeam(ent, 'spectator');
	}

	if (dir !== 1 && dir !== -1) {
		error('followcycle: bad dir ' + dir);
	}

	// If dedicated follow client, just switch between the two auto clients.
	if (ent.client.sess.spectatorClient < 0) {
		if (ent.client.sess.spectatorClient === -1) {
			ent.client.sess.spectatorClient = -2;
		} else if (ent.client.sess.spectatorClient === -2) {
			ent.client.sess.spectatorClient = -1;
		}
		return;
	}

	var clientNum = ent.client.sess.spectatorClient;
	var original = clientNum;

	do {
		clientNum += dir;
		if (clientNum >= level.maxclients) {
			clientNum = 0;
		}
		if (clientNum < 0) {
			clientNum = level.maxclients - 1;
		}

		// Can only follow connected clients.
		if (level.clients[clientNum].pers.connected !== CON.CONNECTED) {
			continue;
		}

		// Can't follow people in other arenas.
		if (level.gentities[clientNum].s.arenaNum !== ent.s.arenaNum) {
			continue;
		}

		// Can't follow another spectator.
		if (level.clients[clientNum].sess.team === TEAM.SPECTATOR) {
			continue;
		}

		// This is good, we can use it.
		ent.client.sess.spectatorClient = clientNum;
		ent.client.sess.spectatorState = SPECTATOR.FOLLOW;

		log('CmdFollowCycle (' + ent.s.number + '): now following ' + clientNum);

		return;
	} while (clientNum !== original);

	// Leave it where it was.
}

/**
 * Say
 */
var MAX_SAY_TEXT = 150;

var SAY = {
	ALL:  0,
	TEAM: 1,
	TELL: 2
};

function Say(ent, target, mode, text) {
	if (!text) {
		return;
	}

	if (level.arena.gametype < GT.TEAM && mode === SAY.TEAM) {
		mode = SAY.ALL;
	}

	var name;
	var color;

	switch (mode) {
		case SAY.ALL:
			// G_LogPrintf( "say: %s: %s\n", ent->client->pers.name, chatText );
			name = ent.client.pers.name;
			color = QS.COLOR.GREEN;
			break;
		// case SAY.TEAM:
		// 	G_LogPrintf( "sayteam: %s: %s\n", ent->client->pers.name, chatText );
		// 	if (Team_GetLocationMsg(ent, location, sizeof(location)))
		// 		Com_sprintf (name, sizeof(name), EC"(%s%c%c"EC") (%s)"EC": ",
		// 			ent->client->pers.name, Q_COLOR_ESCAPE, COLOR_WHITE, location);
		// 	else
		// 		Com_sprintf (name, sizeof(name), EC"(%s%c%c"EC")"EC": ",
		// 			ent->client->pers.name, Q_COLOR_ESCAPE, COLOR_WHITE );
		// 	color = COLOR_CYAN;
		// 	break;
		// case SAY.TELL:
		// 	if (target && level.arena.gametype >= GT.TEAM &&
		// 		target.client.sess.team === ent.client.sess.team &&
		// 		Team_GetLocationMsg(ent, location, sizeof(location))) {
		// 		Com_sprintf (name, sizeof(name), EC"[%s%c%c"EC"] (%s)"EC": ", ent->client->pers.name, Q_COLOR_ESCAPE, COLOR_WHITE, location );
		// 	} else {
		// 		Com_sprintf (name, sizeof(name), EC"[%s%c%c"EC"]"EC": ", ent->client->pers.name, Q_COLOR_ESCAPE, COLOR_WHITE );
		// 	}
		// 	color = COLOR_MAGENTA;
		// 	break;
	}

	// Trim text.
	text = text.substr(0, MAX_SAY_TEXT);

	// if (target) {
	// 	SayTo( ent, target, mode, color, name, text );
	// 	return;
	// }

	// // Echo the text to the console.
	// if (g_dedicated.integer) {
	// 	G_Printf( "%s%s\n", name, text);
	// }

	// Send it to all the apropriate clients.
	for (var i = 0; i < level.maxclients; i++) {
		var other = level.gentities[i];
		SayTo(ent, other, mode, color, name, text);
	}
}

/**
 * SayTo
 */
function SayTo(ent, other, mode, color, name, text) {
	if (!other) {
		return;
	}

	if (!other.inuse) {
		return;
	}

	if (!other.client) {
		return;
	}

	if (other.client.pers.connected !== CON.CONNECTED) {
		return;
	}

	if (mode === SAY.TEAM  && !OnSameTeam(ent, other)) {
		return;
	}

	// No chatting to players in tournements.
	if (level.arena.gametype === GT.TOURNAMENT &&
		other.client.sess.team === TEAM.FREE &&
		ent.client.sess.team !== TEAM.FREE) {
		return;
	}

	SV.SendServerCommand(other.s.number, mode === SAY.TEAM ? 'tchat' : 'chat', name + ' ^' + color + text);
}

/**
 * ClientCmdScore
 */
function ClientCmdScore(ent) {
	SendScoreboardMessage(ent);
}

/**
 * SendScoreboardMessage
 */
function SendScoreboardMessage(to) {
	var arena = level.arenas[to.s.arenaNum];

	var val = {
		scoreRed: arena.teamScores[TEAM.RED],
		scoreBlue: arena.teamScores[TEAM.BLUE],
		scores: []
	};

	for (var i = 0; i < arena.numConnectedClients; i++) {
		var clientNum = arena.sortedClients[i];
		var ent = level.gentities[clientNum];
		var client = ent.client;

		if (ent.s.arenaNum !== to.s.arenaNum) {
			continue;
		}

		var ping = -1;
		if (client.pers.connected !== CON.CONNECTING) {
			ping = client.ps.ping < 999 ? client.ps.ping : 999;
		}

		var accuracy = 0;
		if (client.accuracy_shots) {
			accuracy = client.accuracy_hits * 100 / client.accuracy_shots;
		}

		var perfect = (client.ps.persistant[PERS.RANK] === 0 && client.ps.persistant[PERS.DEATHS] === 0) ? 1 : 0;

		val.scores.push({
			clientNum: clientNum,
			score: client.ps.persistant[PERS.SCORE],
			frags: client.ps.persistant[PERS.FRAGS],
			deaths: client.ps.persistant[PERS.DEATHS],
			time: (level.time - client.pers.enterTime)/60000,
			ping: ping,
			spectatorNum: client.sess.spectatorNum,
			powerups: level.gentities[arena.sortedClients[i]].s.powerups,
			accuracy: accuracy,
			impressive: client.ps.persistant[PERS.IMPRESSIVE_COUNT],
			excellent: client.ps.persistant[PERS.EXCELLENT_COUNT],
			gauntlet: client.ps.persistant[PERS.GAUNTLET_FRAG_COUNT],
			defend: client.ps.persistant[PERS.DEFEND_COUNT],
			assist: client.ps.persistant[PERS.ASSIST_COUNT],
			perfect: perfect,
			captures: client.ps.persistant[PERS.CAPTURES],
			eliminated: client.pers.teamState.state === TEAM_STATE.ELIMINATED
		});
	}

	SV.SendServerCommand(to.s.number, 'scores', val);
}

/**
 * ClientCmdNoclip
 */
function ClientCmdNoclip(ent) {
	// if (!CheatsOk(ent)) {
	// 	return;
	// }

	ent.client.noclip = !ent.client.noclip;

	var msg = 'noclip ON';
	if (!ent.client.noclip) {
		msg = 'noclip OFF';
	}

	SV.SendServerCommand(ent.s.number, 'print', msg);
}

/**
 * ClientCmdTeam
 */
function ClientCmdTeam(ent, teamName) {
	if (teamName === undefined) {
		SV.SendServerCommand(ent.s.number, 'print', 'Invalid team');
		return;
	}

	if (ent.client.switchTeamTime > level.time) {
		SV.SendServerCommand(ent.s.number, 'print', 'May not switch teams more than once per 5 seconds.');
		return;
	}

	// If they are playing a tournement game, count as a loss.
	if (level.arena.gametype === GT.TOURNAMENT && ent.client.sess.team === TEAM.FREE) {
		ent.client.sess.losses++;
	}

	SetTeam(ent, teamName, false);

	ent.client.switchTeamTime = level.time + 5000;
}

/**
 * SetTeam
 */
function SetTeam(ent, teamName) {
	var client = ent.client;
	var clientNum = ent.s.number;

	//
	// See what change is requested
	//
	var team = TEAM.SPECTATOR;
	var groupName = null;
	var specState = SPECTATOR.NOT;
	var specClient = 0;
	var oldTeam = client.sess.team;

	if (teamName === 'scoreboard' || teamName === 'score') {
		team = TEAM.SPECTATOR;
		specState = SPECTATOR.SCOREBOARD;
	} else if (teamName === 'follow1') {
		team = TEAM.SPECTATOR;
		specState = SPECTATOR.FOLLOW;
		specClient = -1;
	} else if (teamName === 'follow2') {
		team = TEAM.SPECTATOR;
		specState = SPECTATOR.FOLLOW;
		specClient = -2;
	} else if (teamName === 'spectator' || teamName === 's') {
		team = TEAM.SPECTATOR;
		specState = SPECTATOR.FREE;
	} else if (level.arena.gametype === GT.ROCKETARENA) {
		if (teamName === '<default>') {
			groupName = ent.client.pers.name + '\'s team';
		} else {
			groupName = teamName;
		}

		// Auto-join if the group is active.
		if (level.arena.group1 === groupName) {
			team = TEAM.RED;
		} else if (level.arena.group2 === groupName) {
			team = TEAM.BLUE;
		} else {
			team = TEAM.SPECTATOR;
		}

		// Make sure we can actually join this group.
		var playersPerTeam = g_playersPerTeam.at(level.arena.arenaNum).get();
		if (TeamGroupCount(groupName, clientNum) >= playersPerTeam) {
			SV.SendServerCommand(ent.s.number, 'print', 'Team is full.');
			return;
		}
	} else if (level.arena.gametype >= GT.TEAM) {
		// If running a team game, assign player to one of the teams.
		if (teamName === 'red' || teamName === 'r') {
			team = TEAM.RED;
		} else if (teamName === 'blue' || teamName === 'b') {
			team = TEAM.BLUE;
		} else {
			team = PickTeam(clientNum);
		}
	} else {
		// Force to free in non-team games.
		team = TEAM.FREE;
	}

	//
	// Decide if we will allow the change.
	//
	if (team === oldTeam && team !== TEAM.SPECTATOR) {
		return;
	}

	//
	// Execute the team change
	//
	client.sess.team = team;
	client.sess.group = groupName;
	client.sess.spectatorState = specState;
	client.sess.spectatorClient = specClient;

	// They go to the end of the line for tournements.
	if (team === TEAM.SPECTATOR) {
		PushClientToQueue(ent);
	}

	// If the player was dead leave the body.
	if (client.ps.pm_type === PM.DEAD) {
		CopyToBodyQueue(ent);
	}

	if (oldTeam !== TEAM.SPECTATOR) {
		// Kill him (makes sure he loses flags, etc).
		ent.flags &= ~GFL.GODMODE;
		client.ps.stats[STAT.HEALTH] = ent.health = 0;
		PlayerDie(ent, ent, ent, 100000, MOD.SUICIDE);
	}

	BroadcastTeamChange(client, oldTeam);
	ClientUserinfoChanged(clientNum);
	ClientBegin(clientNum);
}

/**
 * ClientCmdArenas
 */
function ClientCmdArena(ent, arenaNum) {
	arenaNum = parseInt(arenaNum, 10);

	if (isNaN(arenaNum) || arenaNum < 0 || arenaNum >= level.arenas.length) {
		SV.SendServerCommand(ent.s.number, 'print', 'Invalid arena');
		return;
	}

	if (ent.client.switchArenaTime > level.time) {
		SV.SendServerCommand(ent.s.number, 'print', 'May not switch arenas more than once per 3 seconds.');
		return;
	}

	SetArena(ent, arenaNum);

	ent.client.switchArenaTime = level.time + 3000;
}

/**
 * SetArena
 */
function SetArena(ent, arenaNum) {
	if (arenaNum < 0 || arenaNum >= level.arenas.length) {
		error('Invalid arena number.');
		return;
	}

	// Push off old arena.
	var oldArena = level.arena;

	// Temporarily update while spawning the client.
	level.arena = level.arenas[arenaNum];

	// Change arena and kick to spec.
	ent.s.arenaNum = ent.client.ps.arenaNum = arenaNum;
	SetTeam(ent, 's');

	// Update scores.
	SendScoreboardMessage(ent);

	// Pop back.
	level.arena = oldArena;

	// Recalculate ranks for the old arena now.
	CalculateRanks();
}