/**
 * InitSessionData
 *
 * Called on a first-time connect.
 */
function InitSessionData(client, userinfo) {
	var sess = client.sess;

	if (g_gametype() === GT.CLANARENA) {
		sess.arena = g_forcearena();
	}

	var value = userinfo['team'];
	SetTeam(client, value === 's' ? 's' : 'f');

	// If the client was forced to spec, queue them.
	if (client.sess.sessionTeam === TEAM.SPECTATOR) {
		PushClientToQueue(client);
	}

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
