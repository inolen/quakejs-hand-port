/**
 * InitWorldSession
 */
function InitWorldSession() {
	var session = Cvar.AddCvar('session');
	var gt = session.getAsInt();

	// If the gametype changed since the last session, don't use any
	// client sessions
	if (g_gametype.getAsInt() !== gt) {
		level.newSession = true;
		log('Gametype changed, clearing session data.');
	}
}

/**
 * WriteWorldSession
 */
function WriteWorldSession() {
	var session = Cvar.AddCvar('session');
	session.set('session', g_gametype.getAsInt());

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
	var sess = client.sess;

	var value = userinfo['team'];
	if (value === 's') {
		// A willing spectator, not a waiting-in-line.
		sess.sessionTeam = TEAM.SPECTATOR;
	} else {
		sess.sessionTeam = PickTeam(client.ps.clientNum);

		if (sess.sessionTeam === TEAM.SPECTATOR) {
			var ent = level.gentities[client.ps.clientNum];
			PushClientToQueue(ent);
		}
	}

	WriteSessionData(client);
}

/**
 * ReadSessionData
 *
 * Called on a reconnect.
 */
function ReadSessionData(client) {
	var name = 'session' + client.ps.clientNum;
	var cvar = Cvar.GetCvar(name);

	if (!cvar) {
		return;
	}

	// Parse string.
	var val = JSON.parse(cvar.getAsString());

	client.sess.sessionTeam = val.sessionTeam;
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
	var name = 'session' + client.ps.clientNum;
	var val = JSON.stringify(client.sess);

	var cvar = Cvar.AddCvar(name);
	cvar.set(val);
}