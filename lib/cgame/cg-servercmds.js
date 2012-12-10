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
		var key = cmd.msg.k;
		var val = cmd.msg.v;
		ConfigStringModified(key, val);
		return;
	}
	else if (cmd.type === 'scores') {
		ParseScores(cmd.val);
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
	// if (key === 'music') {
	// 	StartMusic();
	// } else if (num == 'serverinfo') {
	// 	ParseServerinfo();
	// } else if (num == CS_WARMUP) {
	// 	CG_ParseWarmup();
	// } else if (num == CS_SCORES1) {
	// 	cgs.scores1 = atoi( str );
	// } else if (num == CS_SCORES2) {
	// 	cgs.scores2 = atoi( str );
	// } else if (num == CS_LEVEL_START_TIME) {
	// 	cgs.levelStartTime = atoi( str );
	// } else if (num == CS_VOTE_TIME) {
	// 	cgs.voteTime = atoi( str );
	// 	cgs.voteModified = true;
	// } else if (num == CS_VOTE_YES) {
	// 	cgs.voteYes = atoi( str );
	// 	cgs.voteModified = true;
	// } else if (num == CS_VOTE_NO) {
	// 	cgs.voteNo = atoi( str );
	// 	cgs.voteModified = true;
	// } else if (num == CS_VOTE_STRING) {
	// 	Q_strncpyz( cgs.voteString, str, sizeof( cgs.voteString ) );
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
	// } else if (num == CS_INTERMISSION ) {
	// 	cg.intermissionStarted = atoi( str );
	// } else if (num >= CS_MODELS && num < CS_MODELS+MAX_MODELS) {
	// 	cgs.gameModels[ num-CS_MODELS ] = trap_R_RegisterModel( str );
	// } else if (num >= CS_SOUNDS && num < CS_SOUNDS+MAX_SOUNDS) {
	// 	if ( str[0] != '*' ) {	// player specific sounds don't register here
	// 		cgs.gameSounds[ num-CS_SOUNDS] = trap_S_RegisterSound( str, false );
	// 	}
	if (key.indexOf('player') === 0) {
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