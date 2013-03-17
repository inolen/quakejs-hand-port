/**
 * InitWorldSession
 */
function InitWorldSession() {
	var session = Cvar.AddCvar('session');
	var gt = session.get();

	// If the gametype changed since the last session, don't use any
	// client sessions
	if (g_gametype.get() !== gt) {
		level.newSession = true;
		log('Gametype changed, clearing session data.');
	}
}

/**
 * WriteWorldSession
 */
function WriteWorldSession() {
	var session = Cvar.AddCvar('session');
	session.set('session', g_gametype.get());

	for (var i = 0; i < MAX_CLIENTS; i++) {
		if (level.clients[i].pers.connected === CON.CONNECTED) {
			WriteSessionData(level.clients[i]);
		}
	}
}

/**
 * InitSessionData
 *
 * Called on a first-time connect.
 */
function InitSessionData(client, userinfo) {
	var clientNum = level.clients.indexOf(client);
	var sess = client.sess;

	var value = userinfo['team'];

	if (value === 's') {
		// A willing spectator, not a waiting-in-line.
		sess.team = TEAM.SPECTATOR;
	} else {
		if (level.arena.gametype === GT.TOURNAMENT) {
			sess.team = PickTeam(clientNum);
		} else if (level.arena.gametype >= GT.TEAM) {
			// Always auto-join for practice arena.
			if (level.arena.gametype === GT.PRACTICEARENA) {
				sess.team = PickTeam(clientNum);
			} else {
				// Always spawn as spectator in team games.
				sess.team = TEAM.SPECTATOR;
			}
		} else {
			sess.team = TEAM.SPECTATOR;
		}
	}

	PushClientToQueue(level.gentities[clientNum]);

	WriteSessionData(client);
}

/**
 * ReadSessionData
 *
 * Called on a reconnect.
 */
function ReadSessionData(client) {
	var name = 'session' + level.clients.indexOf(client);
	var cvar = Cvar.GetCvar(name);

	if (!cvar) {
		return;
	}

	// Parse string.
	var val = JSON.parse(cvar.get());

	client.sess.team = val.team;
	client.sess.spectatorNum = val.spectatorNum;
	client.sess.spectatorState = val.spectatorState;
	client.sess.spectatorClient = val.spectatorClient;
	client.sess.wins = val.wins;
	client.sess.losses = val.losses;
}

/**
 * WriteSessionData
 *
 * Called on game shutdown
 */
function WriteSessionData(client) {
	var name = 'session' + level.clients.indexOf(client);
	var val = JSON.stringify(client.sess);

	var cvar = Cvar.AddCvar(name);
	cvar.set(val);
}