/**
 * ExecuteNewServerCommands
 *
 * Execute all of the server commands that were received along
 * with this this snapshot.
 */
function ExecuteNewServerCommands(latestSequence) {
	while (cgs.serverCommandSequence < latestSequence) {
		var cmd;

		if ((cmd = cl.GetServerCommand(++cgs.serverCommandSequence))) {
			ExecuteServerCommand(cmd);
		}
	}
}

/**
 * ExecuteServerCommand
 */
function ExecuteServerCommand(cmd) {
	if (cmd.type === 'cs') {
		var key = cmd.val.k;
		var val = cmd.val.v;
		ConfigStringModified(key, val);
		return;
	} else if (cmd.type === 'scores') {
		ParseScores(cmd.val);
	} else if (cmd.type === 'map_restart') {
		MapRestart();
	}
}

/**
 * ParseServerinfo
 *
 * This is called explicitly when the gamestate is first received,
 * and whenever the server updates any serverinfo flagged cvars
 */
function ParseServerinfo() {
	var serverInfo = ConfigString('serverInfo');

	cgs.gametype = serverInfo['g_gametype'];
	cgs.fraglimit = serverInfo['g_fraglimit'];
	cgs.capturelimit = serverInfo['g_capturelimit'];
	cgs.timelimit = serverInfo['g_timelimit'];
	cgs.maxclients = serverInfo['sv_maxClients'];
	cgs.mapname = serverInfo['sv_mapname'];
}

/**
 * ConfigStringModified
 */
function ConfigStringModified(key, val) {
	// Get the gamestate from the client system, which will have the
	// new configstring already integrated.
	// trap_GetGameState( &cgs.gameState );

	// Do something with it if necessary.
	if (key === 'music') {
		StartMusic();
	} else if (key === 'serverinfo') {
		ParseServerinfo();
	// } else if (num == CS_WARMUP) {
	// 	CG_ParseWarmup();
	} else if (key === 'scores1') {
		cgs.scores1 = val;
	} else if (key === 'scores2') {
		cgs.scores2 = val;
	} else if (key === 'levelStartTime') {
		cgs.levelStartTime = val;
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
	// 	}
	else if (key.indexOf('player') === 0) {
		var clientNum = parseInt(key.substr(6), 10);
		NewClientInfo(clientNum);
		// BuildSpectatorString();
	}
	// else if (num == CS_FLAGSTATUS) {
	// 	if( cgs.gametype == GT.CTF ) {
	// 		// format is rb where its red/blue, 0 is at base, 1 is taken, 2 is dropped
	// 		cgs.redflag = str[0] - '0';
	// 		cgs.blueflag = str[1] - '0';
	// 	}
	// }
	// else if (num == CS_SHADERSTATE) {
	// 	CG_ShaderStateChanged();
	// }
}

/**
 * ParseScores
 */
function ParseScores(val) {
	cg.teamScoreRed = val.red;
	cg.teamScoreBlue = val.blue;

	// Hulk smash the old array.
	cg.scores = new Array(val.scores);

	for (var i = 0; i < val.scores.length; i++) {
		var s0 = val.scores[i];
		var s1 = cg.scores[i] = new ClientScore();

		s1.clientInfo = cgs.clientinfo[s0.clientNum];
		s1.score = s0.score;
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

		cgs.clientinfo[s0.clientNum].score = s0.score;
		cgs.clientinfo[s0.clientNum].powerups = s0.powerups;
	}

	cg_scoreboard.setScores(cg.scores);
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
	if (cg_showmiss()) {
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
	// snd.ClearLoopingSounds(true);

	// Play the "fight" sound if this is a restart without warmup.
	// if (cg.warmup === 0 /* && cgs.gametype == GT_TOURNAMENT */) {
	// 	snd.StartLocalSound(cgs.media.countFightSound, CHAN_ANNOUNCER);
	// 	CG_CenterPrint( "FIGHT!", 120, GIANTCHAR_WIDTH*2 );
	// }
}