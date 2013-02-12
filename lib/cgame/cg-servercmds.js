/**
 * ExecuteNewServerCommands
 *
 * Execute all of the server commands that were received along
 * with this this snapshot.
 */
function ExecuteNewServerCommands(latestSequence) {
	while (cgs.serverCommandSequence < latestSequence) {
		var cmd;

		if ((cmd = CL.GetServerCommand(++cgs.serverCommandSequence))) {
			ExecuteServerCommand(cmd);
		}
	}
}

/**
 * ExecuteServerCommand
 */
function ExecuteServerCommand(cmd) {
	if (cmd.type === 'cs') {
		var key = cmd.data.k;
		var val = cmd.data.v;
		ConfigStringModified(key, val);
		return;
	} else if (cmd.type === 'cp') {
		hud_model.setCenterPrint(cmd.data);
		return;
	} else if (cmd.type === 'print') {
		// Output to console for debugging.
		log(cmd.data);
		return;
	} else if (cmd.type === 'chat') {
		// if (!cg_teamChatsOnly.integer) {
			SND.StartLocalSound(cgs.media.talkSound/*, CHAN_LOCAL_SOUND*/);
			log(cmd.data);
		// }
		return;
	} else if (cmd.type === 'tchat') {
		SND.StartLocalSound(cgs.media.talkSound/*, CHAN_LOCAL_SOUND*/);
		log(cmd.data);
		return;
	} else if (cmd.type === 'scores') {
		ParseScores(cmd.data);
		return;
	} else if (cmd.type === 'map_restart') {
		MapRestart();
		return;
	}

	log('Unknown client game command:', cmd.type);
}

/**
 * ProcessConfigStrings
 *
 * Called explicitly in init to process all the current config strings.
 */
function ProcessConfigStrings() {
	for (var key in cgs.gameState) {
		if (!cgs.gameState.hasOwnProperty(key)) {
			continue;
		}

		ConfigStringModified(key, cgs.gameState[key]);
	}
}

/**
 * ConfigStringModified
 */
function ConfigStringModified(key, val) {
	// Do something with it if necessary.
	if (key === 'music') {
		StartMusic();
	} else if (key === 'serverInfo') {
		ParseServerinfo();
	} else if (key === 'levelStartTime') {
		cgs.levelStartTime = Configstring('levelStartTime');
	} else if (key.indexOf('arena') === 0) {
		var arenaNum = parseInt(key.substr(5), 10);
		ParseArenaInfo(arenaNum);
	} else if (key.indexOf('team') === 0) {
		var teamNum = parseInt(key.substr(4), 10);
		ParseTeamInfo(teamNum);
	} else if (key.indexOf('player') === 0) {
		var clientNum = parseInt(key.substr(6), 10);
		NewClientInfo(clientNum);
		// BuildSpectatorString();
	} else if (key === 'voteTime') {
		cgs.voteTime = val;
		cgs.voteModified = true;
	} else if (key === 'voteYes') {
		cgs.voteYes = val;
		cgs.voteModified = true;
	} else if (key === 'voteNo') {
		cgs.voteNo = val;
		cgs.voteModified = true;
	} else if (key === 'voteString') {
		cgs.voteString = val;
	// } else if (num >= CS_TEAMVOTE_TIME && num <= CS_TEAMVOTE_TIME + 1) {
	// 	cgs.teamVoteTime[num-CS_TEAMVOTE_TIME] = atoi( str );
	// 	cgs.teamVoteModified[num-CS_TEAMVOTE_TIME] = true;
	// } else if (num >= CS_TEAMVOTE_YES && num <= CS_TEAMVOTE_YES + 1) {
	// 	cgs.teamVoteYes[num-CS_TEAMVOTE_YES] = atoi( str );
	// 	cgs.teamVoteModified[num-CS_TEAMVOTE_YES] = true;
	// } else if (num >= CS_TEAMVOTE_NO && num <= CS_TEAMVOTE_NO + 1) {
	// 	cgs.teamVoteNo[num-CS_TEAMVOTE_NO] = atoi( str );
	// 	cgs.teamVoteModified[num-CS_TEAMVOTE_NO] = true;
	// } else if (num >= CS_TEAMVOTE_STRING && num <= CS_TEAMVOTE_STRING + 1) {
	// 	Q_strncpyz( cgs.teamVoteString[num-CS_TEAMVOTE_STRING], str, sizeof( cgs.teamVoteString ) );
	} else if (key === 'intermission') {
		cg.intermissionStarted = val;
	}
	// } else if (num >= CS_MODELS && num < CS_MODELS+MAX_MODELS) {
	// 	cgs.gameModels[ num-CS_MODELS ] = trap_R_RegisterModel( str );
	// } else if (num >= CS_SOUNDS && num < CS_SOUNDS+MAX_SOUNDS) {
	// 	if ( str[0] != '*' ) {	// player specific sounds don't register here
	// 		cgs.gameSounds[ num-CS_SOUNDS] = trap_S_RegisterSound( str, false );
	// 	};
	// } else if (key === 'flagstatus') {
	// 	if( cgs.gametype == GT.CTF ) {
	// 		// format is rb where its red/blue, 0 is at base, 1 is taken, 2 is dropped
	// 		cgs.redflag = val[0];
	// 		cgs.blueflag = val[1];
	// 	}
	// }
	// else if (num == CS_SHADERSTATE) {
	// 	CG_ShaderStateChanged();
	// }
}

/**
 * ParseServerinfo
 *
 * This is called explicitly when the gamestate is first received,
 * and whenever the server updates any serverinfo flagged cvars
 */
function ParseServerinfo() {
	var serverInfo = Configstring('serverInfo');

	cgs.maxclients = serverInfo['sv_maxClients'];
	cgs.mapname = serverInfo['sv_mapname'];
	cgs.gametype = serverInfo['g_gametype'];
	cgs.timelimit = serverInfo['g_timelimit'];

	// Update views that depend on the gametype.
	hud_model.gametype(BG.GametypeNames[cgs.gametype]);
	currentgame_model.gametype(BG.GametypeNames[cgs.gametype]);
	scoreboard_model.gametype(BG.GametypeNames[cgs.gametype]);
}

/**
 * ParseArenaInfo
 *
 * Called after the first snapshot / when changing arenas
 * to set the initial values from configstrings.
 */
function ParseArenaInfo(arenaNum) {
	cgs.arenas[arenaNum] = Configstring('arena' + arenaNum);

	UpdateArenas();
}

/**
 * ParseTeamInfo
 */
function ParseTeamInfo(teamNum) {
	cgs.teams[teamNum] = Configstring('team' + teamNum);

	UpdateTeams();
}

/**
 * ParseScores
 */
function ParseScores(val) {
	// Hulk smash the old array.
	cg.scores = new Array(val.scores);

	scoreboard_model.score1(val.scoreRed);
	scoreboard_model.score2(val.scoreBlue);
	scoreboard_model.resetScores();

	for (var i = 0; i < val.scores.length; i++) {
		var s0 = val.scores[i];
		var s1 = cg.scores[i] = new ClientScore();

		s1.clientInfo = cgs.clientinfo[s0.clientNum];
		s1.score = s0.score;
		s1.spectatorNum = s0.spectatorNum;
		s1.ping = s0.ping;
		s1.time = s0.time;
		s1.accuracy = s0.accuracy;
		s1.impressiveCount = s0.impressive;
		s1.excellentCount = s0.excellent;
		s1.guantletCount = s0.guantlet;
		s1.defendCount = s0.defend;
		s1.assistCount = s0.assist;
		s1.perfect = s0.perfect;
		s1.captures = s0.captures;
		s1.team = cgs.clientinfo[s0.clientNum].team;
		s1.eliminated = s0.eliminated;

		cgs.clientinfo[s0.clientNum].score = s0.score;
		cgs.clientinfo[s0.clientNum].powerups = s0.powerups;

		switch (s1.team) {
			case TEAM.FREE:
				scoreboard_model.addFreeScore(s1.spectatorNum, s1.clientInfo.name, s1.score, s1.ping, s1.time, s1.eliminated);
				break;
			case TEAM.RED:
				scoreboard_model.addRedScore(s1.spectatorNum, s1.clientInfo.name, s1.score, s1.ping, s1.time, s1.eliminated);
				break;
			case TEAM.BLUE:
				scoreboard_model.addBlueScore(s1.spectatorNum, s1.clientInfo.name, s1.score, s1.ping, s1.time, s1.eliminated);
				break;
			case TEAM.SPECTATOR:
				scoreboard_model.addSpecScore(s1.spectatorNum, s1.clientInfo.name, s1.score, s1.ping, s1.time, s1.eliminated);
				break;
		}
	}
}

/**
 * MapRestart
 *
 * The server has issued a map_restart, so the next snapshot
 * is completely new and should not be interpolated to.
 *
 * A tournement restart will clear everything, but doesn't
 * require a reload of all the media
 */
function MapRestart() {
	if (cg_showmiss.getAsInt()) {
		log('MapRestart');
	}

	InitLocalEntities();

	// Make sure the "3 frags left" warnings play again.
	cg.fraglimitWarnings = 0;
	cg.timelimitWarnings = 0;
	// cg.rewardTime = 0;
	// cg.rewardStack = 0;
	cg.intermissionStarted = false;
	// cg.levelShot = false;
	cgs.voteTime = 0;

	cg.mapRestart = true;

	// TODO We really should clear more parts of cg here and stop sounds.
	StartMusic();
	// SND.ClearLoopingSounds(true);
}
