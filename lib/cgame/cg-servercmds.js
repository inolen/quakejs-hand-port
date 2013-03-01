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
	if (split === 'music') {
		StartMusic();
	} else if (key === 'levelStartTime') {
		cgs.levelStartTime = Configstring('levelStartTime');
	} else if (key === 'serverInfo') {
		ParseServerinfo();
	} else if (key.indexOf('arena') === 0) {
		ParseArenaInfo(key, val);
	} else if (key.indexOf('player') === 0) {
		var split = key.split(':');
		NewClientInfo(split[1]);
	// } else if (key === 'voteTime') {
	// 	cgs.voteTime = val;
	// 	cgs.voteModified = true;
	// } else if (key === 'voteYes') {
	// 	cgs.voteYes = val;
	// 	cgs.voteModified = true;
	// } else if (key === 'voteNo') {
	// 	cgs.voteNo = val;
	// 	cgs.voteModified = true;
	// } else if (key === 'voteString') {
	// 	cgs.voteString = val;
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
	cgs.timelimit = serverInfo['g_timelimit'];
	cgs.fraglimit = serverInfo['g_fraglimit'];
	cgs.capturelimit = serverInfo['g_capturelimit'];
}

/**
 * ParseArenaInfo
 *
 * Called after the first snapshot / when changing arenas
 * to set the initial values from configstrings.
 */
function ParseArenaInfo(key, info) {
	var split = key.split(':');
	var arenaNum = parseInt(split[1], 10);

	var arena = cgs.arenas[arenaNum];
	if (!arena) {
		arena = cgs.arenas[arenaNum] = new ArenaInfo();
	}

	arena.name = info.name;
	arena.gametype = info.gt;
	arena.gamestate = info.gs;
	arena.playersPerTeam = info.ppt;
	arena.numConnectedClients = info.nc;
	arena.warmupTime = info.wt;
	arena.score1 = info.s1;
	arena.score2 = info.s2;

	UpdateGameArenas();
}

/**
 * ParseScores
 */
function ParseScores(val) {
	scoreboard_model.score1(val.scoreRed);
	scoreboard_model.score2(val.scoreBlue);
	scoreboard_model.resetScores();

	for (var i = 0; i < val.scores.length; i++) {
		var score = val.scores[i];
		var clientInfo = cgs.clientinfo[score.clientNum];

		// cgs.clientinfo[s0.clientNum].powerups = s.powerups;

		switch (clientInfo.team) {
			case TEAM.FREE:
				scoreboard_model.addFreeScore(clientInfo.name, score.score, score.ping, score.time, score.eliminated);
				break;
			case TEAM.RED:
				scoreboard_model.addRedScore(clientInfo.name, score.score, score.ping, score.time, score.eliminated);
				break;
			case TEAM.BLUE:
				scoreboard_model.addBlueScore(clientInfo.name, score.score, score.ping, score.time, score.eliminated);
				break;
			case TEAM.SPECTATOR:
				scoreboard_model.addSpecScore(clientInfo.name, score.score, score.ping, score.time, score.eliminated);
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
	if (cg_showmiss.get()) {
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