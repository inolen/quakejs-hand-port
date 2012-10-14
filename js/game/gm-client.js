var playerMins = [-15, -15, -24];
var playerMaxs = [15, 15, 32];

function ClientBegin(clientNum) {
	var client = level.clients[clientNum] = new GameClient();
	var ent = level.gentities[clientNum] = new GameEntity();

	ent.s.number = clientNum;
	ent.client = client;
	ent.contents = ContentFlags.BODY;

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

	// update game entity info
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

	var spawnpoint = SelectRandomDeathmatchSpawnPoint();

	ps.origin = spawnpoint.s.origin;
	ps.origin[2] += 70;
	ps.velocity = [0, 0, 0];
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