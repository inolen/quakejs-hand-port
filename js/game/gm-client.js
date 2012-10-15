var playerMins = [-15, -15, -24];
var playerMaxs = [15, 15, 32];

function ClientBegin(clientNum) {
	var client = level.clients[clientNum] = new GameClient();
	var ent = level.gentities[clientNum] = new GameEntity();

	ent.client = client;
	ent.s.number = clientNum;
	ent.client.ps.clientNum = clientNum;

	ClientSpawn(ent);
}

function ClientThink(clientNum, cmd) {
	var client = level.clients[clientNum];
	var ent = level.gentities[clientNum];

	// sanity check the command time to prevent speedup cheating
	if (cmd.serverTime > level.time + 200) {
		cmd.serverTime = level.time + 200;
	}
	if (cmd.serverTime < level.time - 1000) {
		cmd.serverTime = level.time - 1000;
	}

	client.ps.gravity = g_gravity();
	client.ps.speed = 320;

	var pm = new PmoveInfo();
	pm.ps = client.ps;
	pm.cmd = cmd;
	pm.tracemask = ContentMasks.PLAYERSOLID;
	pm.trace = sv.Trace;
	bg.Pmove(pm);

	// Save results of pmove.
	bg.PlayerStateToEntityState(ent.client.ps, ent.s);

	// Update game entity info.
	vec3.set(client.ps.origin, ent.currentOrigin);
	vec3.set(pm.mins, ent.mins);
	vec3.set(pm.maxs, ent.maxs);
	sv.LinkEntity(ent);

	TouchTriggers(ent);

	// NOTE: now copy the exact origin over otherwise clients can be snapped into solid
	//VectorCopy( ent->client->ps.origin, ent->r.currentOrigin );
}

function GetClientPlayerstate(clientNum) {
	var client = level.clients[clientNum];
	return client.ps;
}

function ClientSpawn(ent) {
	var client = ent.client;
	var ps = ent.client.ps;

	ent.classname = 'player';
	ent.contents = ContentTypes.BODY;
	ent.s.groundEntityNum = ENTITYNUM_NONE;

	var spawnpoint = SelectRandomDeathmatchSpawnPoint();

	vec3.set(spawnpoint.s.origin, ps.origin);
	ps.origin[2] += 70;
	vec3.set(ps.velocity, [0, 0, 0]);
}

/**
 * ClientDisconnect
 *
 * Called when a player drops from the server, will not be
 * called between levels.
 * This should NOT be called directly by any game logic,
 * call sv.DropClient(), which will call this and do
 * server system housekeeping.
 */
function ClientDisconnect(clientNum) {
	var ent = level.gentities[clientNum];

	if (!ent.client/* || ent.client.pers.connected == CON_DISCONNECTED*/) {
		return;
	}

	console.log('ClientDisconnect: ' + clientNum);

	sv.UnlinkEntity (ent);
	ent.s.modelindex = 0;
	ent.classname = 'disconnected';
	/*ent.client.pers.connected = CON_DISCONNECTED;
	ent.client.ps.persistant[PERS_TEAM] = TEAM_FREE;
	ent.client.sess.sessionTeam = TEAM_FREE;
	trap_SetConfigstring( CS_PLAYERS + clientNum, "");*/
}

function SelectNearestDeathmatchSpawnPoint(from) {
	var nearestDist = 999999;
	var nearestSpot = null;
	var spawnpoints = FindEntity('classname', 'info_player_deathmatch');

	for (var i = 0; i < spawnpoints.length; i++) {
		var spawnpoint = spawnpoints[i];
		var dist = vec3.length(vec3.subtract(spawnpoint.origin, from, [0, 0, 0]));

		if (dist < nearestDist) {
			nearestDist = dist;
			nearestSpot = spawnpoint;
		}
	}

	return nearestSpot;
}

function SelectRandomDeathmatchSpawnPoint() {
	var spawnpoints = FindEntity('classname', 'info_player_deathmatch');
	return spawnpoints[Math.floor(Math.random()*spawnpoints.length)];
}