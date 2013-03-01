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
	// else if (Q_stricmp (cmd, "follow") == 0)
	// 	Cmd_Follow_f (ent);
	// else if (Q_stricmp (cmd, "follownext") == 0)
	// 	Cmd_FollowCycle_f (ent, 1);
	// else if (Q_stricmp (cmd, "followprev") == 0)
	// 	Cmd_FollowCycle_f (ent, -1);
	else if (name === 'team') {
		ClientCmdTeam(ent, args[0]);
	}
	else if (name === 'arena') {
		ClientCmdArena(ent, args[0]);
	}
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
	// else
	// 	trap_SendServerCommand( clientNum, va("print \"unknown cmd %s\n\"", cmd ) );
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
function SendScoreboardMessage(ent) {
	var arena = level.arenas[ent.s.arenaNum];

	var val = {
		scoreRed: arena.teamScores[TEAM.RED],
		scoreBlue: arena.teamScores[TEAM.BLUE],
		scores: []
	};

	for (var i = 0; i < arena.numConnectedClients; i++) {
		var clientNum = arena.sortedClients[i];
		var client = level.clients[clientNum];

		var ping = -1;
		if (client.pers.connected !== CON.CONNECTING) {
			ping = client.ps.ping < 999 ? client.ps.ping : 999;
		}

		var accuracy = 0;
		if (client.accuracy_shots) {
			accuracy = client.accuracy_hits * 100 / client.accuracy_shots;
		}

		var perfect = (client.ps.persistant[PERS.RANK] === 0 && client.ps.persistant[PERS.KILLED] === 0) ? 1 : 0;

		val.scores.push({
			clientNum: clientNum,
			score: client.ps.persistant[PERS.SCORE],
			spectatorNum: client.sess.spectatorNum,
			ping: ping,
			time: (level.time - client.pers.enterTime)/60000,
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

	SV.SendServerCommand(ent.s.number, 'scores', val);
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

	SetTeam(ent.client, teamName, false);

	ent.client.switchTeamTime = level.time + 5000;
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