var playerMins = [-15, -15, -24];
var playerMaxs = [15, 15, 32];

function ClientBegin(clientNum) {
	var client = level.clients[clientNum] = new GameClient();

	ClientSpawn(client);
}

function ClientThink(clientNum, cmd) {
	var client = level.clients[clientNum];

	// sanity check the command time to prevent speedup cheating
	/*if (cmd->serverTime > level.time + 200) {
		cmd->serverTime = level.time + 200;
	}
	if (cmd->serverTime < level.time - 1000) {
		cmd->serverTime = level.time - 1000;
	}*/

	client.ps.gravity = 800;
	client.ps.speed = 320;

	var pm = new PmoveInfo();
	pm.ps = client.ps;
	pm.cmd = cmd;
	pm.tracemask = MASK_PLAYERSOLID;
	pm.trace = sv.Trace;

	com.Pmove(pm);
}

function GetClientPlayerstate(clientNum) {
	var client = level.clients[clientNum];
	return client.ps;
}

function ClientSpawn(client) {
	var spawnPoint = SelectRandomDeathmatchSpawnPoint();

	client.ps.origin = spawnPoint.origin;
	client.ps.origin[2] += 70;
	client.ps.velocity = [0, 0, 0];
}

function SelectNearestDeathmatchSpawnPoint(from) {
	var nearestDist = 999999;
	var nearestSpot = null;
	var entities = sv.GetEntities();

	_.each(entities.info_player_deathmatch, function (spawnpoint) {
		var dist = vec3.length(vec3.subtract(spawnpoint.origin, from, [0, 0, 0]));

		if (dist < nearestDist) {
			nearestDist = dist;
			nearestSpot = spawnpoint;
		}
	});

	return nearestSpot;
}

function SelectRandomDeathmatchSpawnPoint() {
	var entities = sv.GetEntities();
	var spawnpoints = entities.info_player_deathmatch;

	return spawnpoints[Math.floor(Math.random()*spawnpoints.length)];
}