/**
 * ClientCommand
 */
function ClientCommand(clientNum, cmd) {
	var ent = level.gentities[clientNum];
	if (!ent.client || ent.client.pers.connected !== CON.CONNECTED) {
		return;  // not fully in game yet
	}

	// if (Q_stricmp (cmd, "say") == 0) {
	// 	Cmd_Say_f (ent, SAY_ALL, qfalse);
	// 	return;
	// }
	// if (Q_stricmp (cmd, "say_team") == 0) {
	// 	Cmd_Say_f (ent, SAY_TEAM, qfalse);
	// 	return;
	// }
	// if (Q_stricmp (cmd, "tell") == 0) {
	// 	Cmd_Tell_f ( ent );
	// 	return;
	// }
	if (cmd.type === 'score') {
		ClientCmdScore(ent);
		return;
	}

	// // ignore all other commands when at intermission
	// if (level.intermissiontime) {
	// 	Cmd_Say_f (ent, qfalse, qtrue);
	// 	return;
	// }

	if (cmd.type === 'ccmd') {
		var args = cmd.val;
		var name = args[0];

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
			ClientCmdTeam(ent, args[1]);
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
}

/**
 * ClientCmdScore
 */
function ClientCmdScore(ent) {
	DeathmatchScoreboardMessage(ent);
}

/**
 * DeathmatchScoreboardMessage
 */
function DeathmatchScoreboardMessage(ent) {
	var numSorted = level.numConnectedClients;

	var val = {
		red: level.teamScores[TEAM.RED],
		blue: level.teamScores[TEAM.BLUE],
		scores: []
	};

	for (var i = 0; i < numSorted; i++) {
		var clientNum = level.sortedClients[i];
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
			ping: ping,
			time: (level.time - client.pers.enterTime)/60000,
			powerups: level.gentities[level.sortedClients[i]].s.powerups,
			accuracy: accuracy,
			impressive: client.ps.persistant[PERS.IMPRESSIVE_COUNT],
			excellent: client.ps.persistant[PERS.EXCELLENT_COUNT],
			gauntlet: client.ps.persistant[PERS.GAUNTLET_FRAG_COUNT],
			defend: client.ps.persistant[PERS.DEFEND_COUNT],
			assist: client.ps.persistant[PERS.ASSIST_COUNT],
			perfect: perfect,
			captures: client.ps.persistant[PERS.CAPTURES]
		});
	}

	sv.SendServerCommand(ent.s.number, 'scores', val);
}

/**
 * ClientCmdNoclip
 */
function ClientCmdNoclip(ent) {
	// if (!CheatsOk(ent)) {
	// 	return;
	// }

	console.log('GOT NOCLIP CMD');

	ent.client.noclip = !ent.client.noclip;

	var msg = 'noclip ON';
	if (!ent.client.noclip) {
		msg = 'noclip OFF';
	}

	sv.SendServerCommand(ent.s.number, 'print', msg);
}

/**
 * ClientCmdTeam
 */
function ClientCmdTeam(ent, teamName) {
	if (!teamName) {
		var oldTeam = ent.client.sess.sessionTeam;
		switch (oldTeam) {
			case TEAM.BLUE:
				sv.SendServerCommand(ent.s.number, 'print', 'Blue team');
				break;
			case TEAM.RED:
				sv.SendServerCommand(ent.s.number, 'print', 'Red team');
				break;
			case TEAM.FREE:
				sv.SendServerCommand(ent.s.number, 'print', 'Free team');
				break;
			case TEAM.SPECTATOR:
				sv.SendServerCommand(ent.s.number, 'print', 'Spectator team');
				break;
		}
		return;
	}

	if (ent.client.switchTeamTime > level.time) {
		sv.SendServerCommand(ent.s.number, 'print', 'May not switch teams more than once per 5 seconds.');
		return;
	}

	// If they are playing a tournement game, count as a loss.
	if (g_gametype() === GT.TOURNAMENT && ent.client.sess.sessionTeam === TEAM.FREE) {
		ent.client.sess.losses++;
	}

	SetTeam(ent, teamName);

	ent.client.switchTeamTime = level.time + 5000;
}