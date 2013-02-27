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
		var split = key.split('_');
		var teamNum = parseInt(split[0].substr(4), 10);
		var arenaNum = parseInt(split[1], 10);
		ParseTeamInfo(arenaNum, teamNum);
	} else if (key.indexOf('player') === 0) {
		var clientNum = parseInt(key.substr(6), 10);
		ParseClientInfo(clientNum);
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
function ParseArenaInfo(arenaNum) {
	var arena = cgs.arenas[arenaNum];
	if (!arena) {
		arena = cgs.arenas[arenaNum] = new ArenaInfo();
	}

	var info = Configstring('arena' + arenaNum);

	arena.name = info.name;
	arena.gametype = info.gt;
	arena.gamestate = info.gs;
	arena.playersPerTeam = info.ppt;
	arena.numConnectedClients = info.nc;
	arena.warmupTime = info.wt;
	arena.team1 = info.t1;
	arena.team2 = info.t2;

	UpdateArena(arenaNum);
}

/**
 * ParseTeamInfo
 */
function ParseTeamInfo(arenaNum, teamNum) {
	var info = Configstring('team' + teamNum + '_' + arenaNum);

	var arena = cgs.arenas[arenaNum];
	var team = arena.teams[teamNum];

	team.name = info.n;
	team.score = info.s;
	team.count = info.c;
	team.alive = info.a;

	UpdateTeam(arenaNum, teamNum);
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
