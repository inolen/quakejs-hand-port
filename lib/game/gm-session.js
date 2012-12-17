/**
 * InitSessionData
 *
 * Called on a first-time connect.
 */
function InitSessionData(client, userinfo) {
	var sess = client.sess;

	// Initial team determination.
	if (g_gametype() >= GT.TEAM) {
		if (g_gametype() === GT.CLANARENA) {
			sess.arena = g_forcearena();
		}

		if (g_teamAutoJoin()) {
			sess.sessionTeam = PickTeam(sess.arena, null);
			BroadcastTeamChange(null, client);
		} else {
			// Always spawn as spectator in team games.
			sess.sessionTeam = TEAM.SPECTATOR;
		}
	} else {
		var value = userinfo['team'];
		if (value === 's') {
			// A willing spectator, not a waiting-in-line.
			sess.sessionTeam = TEAM.SPECTATOR;
		} else {
			switch (g_gametype()) {
				default:
				case GT.FFA:
				// case GT.SINGLE_PLAYER:
					if (g_maxGameClients() > 0 &&
						level.numNonSpectatorClients >= g_maxGameClients()) {
						sess.sessionTeam = TEAM.SPECTATOR;
					} else {
						sess.sessionTeam = TEAM.FREE;
					}
					break;
				case GT.TOURNAMENT:
					// If the game is full, go into a waiting mode.
					if (level.numNonSpectatorClients >= 2) {
						sess.sessionTeam = TEAM.SPECTATOR;
					} else {
						sess.sessionTeam = TEAM.FREE;
					}
					break;
			}
		}
	}

	if (sess.sessionTeam === TEAM.SPECTATOR) {
		sess.spectatorState = SPECTATOR.FREE;
	} else {
		sess.spectatorState = SPECTATOR.NOT;
	}

	// AddTournamentQueue(client);

	WriteClientSessionData(client);
}

/**
 * ReadSessionData
 *
 * Called on a reconnect.
 */
function ReadSessionData(client) {
	var name = 'session' + client.ps.clientNum;
	var val = com.GetCvarVal(name);

	// Parse string.
	val = JSON.parse(val);

	client.sess.arena = val.arena;
	client.sess.sessionTeam = val.sessionTeam;
	client.sess.spectatorNum = val.spectatorNum;
	client.sess.spectatorState = val.spectatorState;
	client.sess.spectatorClient = val.spectatorClient;
	client.sess.wins = val.wins;
	client.sess.losses = val.losses;
	client.sess.teamLeader = val.teamLeader;
}


/**
 * WriteClientSessionData
 *
 * Called on game shutdown
 */
function WriteClientSessionData(client) {
	var name = 'session' + client.ps.clientNum;
	var val = JSON.stringify(client.sess);
	com.SetCvarVal(name, val);
}

/**
 * InitWorldSession
 */
function InitWorldSession() {
	var gt = parseInt(com.GetCvarVal('session'), 10);

	// If the gametype changed since the last session, don't use any
	// client sessions
	if (g_gametype() !== gt) {
		level.newSession = true;
		log('Gametype changed, clearing session data.');
	}
}

/**
 * WriteSessionData
 */
function WriteSessionData() {
	com.SetCvarVal('session', g_gametype());

	for (var i = 0; i < MAX_CLIENTS; i++) {
		if (level.clients[i].pers.connected === CON.CONNECTED) {
			WriteClientSessionData(level.clients[i]);
		}
	}
}
