var playerMins = [-15, -15, -24];
var playerMaxs = [15, 15, 32];

/**
 * ClientConnect
 *
 * Called when a player begins connecting to the server.
 * Called again for every map change or tournement restart.
 *
 * The session information will be valid after exit.
 *
 * Return NULL if the client should be allowed, otherwise return
 * a string with the reason for denial.
 * 
 * Otherwise, the client will be sent the current gamestate
 * and will eventually get to ClientBegin.
 *
 * firstTime will be qtrue the very first time a client connects
 * to the server machine, but qfalse on map changes and tournement
 * restarts.
 */
function ClientConnect(clientNum, firstTime) {
	var client = level.clients[clientNum] = new GameClient();
	var ent = level.gentities[clientNum] = new GameEntity();

	ent.client = client;
	
	/*client.pers.connected = CON_CONNECTING;

	// read or initialize the session data
	if (firstTime || level.newSession) {
		G_InitSessionData( client, userinfo );
	}
	G_ReadSessionData( client );*/

	// get and distribute relevent paramters
	log('ClientConnect ' + clientNum);
	ClientUserinfoChanged(clientNum);

	return null;
}

/**
 *
 * ClientUserInfoChanged
 * 
 * Called from ClientConnect when the player first connects and
 * directly by the server system when the player updates a userinfo variable.
 * 
 * The game can override any of the settings and call trap_SetUserinfo
 * if desired.
 */
function ClientUserinfoChanged(clientNum) {
	var ent = level.gentities[clientNum];
	var client = ent.client;
	var userinfo = sv.GetUserinfo(clientNum);

	client.pers.netname = userinfo['name'];

	var cs = {
		'name': client.pers.netname
	};

	sv.SetConfigstring('player' + clientNum, cs);

	// This is not the userinfo, more like the configstring actually.
	log('ClientUserinfoChanged: ' + clientNum + ' ' + JSON.stringify(cs));
}


/**
 * ClientBegin
 *
 * Called when a client has connected and has the ACTIVE state.
 */
function ClientBegin(clientNum) {
	var ent = level.gentities[clientNum];

	ent.s.number = clientNum;
	ent.client.ps.clientNum = clientNum;

	ClientSpawn(ent);
}

/**
 * ClientThink
 */
function ClientThink(clientNum) {
	var client = level.clients[clientNum];
	var ent = level.gentities[clientNum];

	// Grab the latest command.
	sv.GetUserCmd(clientNum, ent.client.pers.cmd);

	var cmd = ent.client.pers.cmd;

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
	pm.client = false;
	bg.Pmove(pm);

	// Save results of pmove.
	bg.PlayerStateToEntityState(ent.client.ps, ent.s);

	// Update game entity info.
	vec3.set(client.ps.origin, ent.currentOrigin);
	vec3.set(pm.mins, ent.mins);
	vec3.set(pm.maxs, ent.maxs);

	// Link entity now, after any personal teleporters have been used.
	sv.LinkEntity(ent);

	TouchTriggers(ent);

	// NOTE: now copy the exact origin over otherwise clients can be snapped into solid
	vec3.set(ent.client.ps.origin, ent.currentOrigin);
}

/**
 * GetClientPlayerstate
 */
function GetClientPlayerstate(clientNum) {
	var client = level.clients[clientNum];
	return client.ps;
}

/**
 * ClientSpawn
 */
function ClientSpawn(ent) {
	var client = ent.client;
	var ps = ent.client.ps;

	ent.classname = 'player';
	ent.contents = ContentTypes.BODY;
	ent.s.groundEntityNum = ENTITYNUM_NONE;
	vec3.set(playerMins, ent.mins);
	vec3.set(playerMaxs, ent.maxs);

	var spawnpoint = SelectRandomDeathmatchSpawnPoint();
	var spawnorigin = vec3.create(spawnpoint.s.origin);
	spawnorigin[2] += 9;

	SetOrigin(ent, spawnorigin);
	vec3.set(spawnorigin, ps.origin);
	vec3.set(ps.velocity, [0, 0, 0]);

	sv.GetUserCmd(client.ps.clientNum, ent.client.pers.cmd);
	SetClientViewAngle(ent, spawnpoint.s.angles);

	// Set default animations.
	ps.torsoAnim = Animations.TORSO_STAND;
	ps.legsAnim = Animations.LEGS_IDLE;

	ps.weapon = Weapon.ROCKET_LAUNCHER;

	// Run a client frame to drop exactly to the floor,
	// initialize weapon, animations and other things.
	client.ps.commandTime = level.time - 100;
	client.pers.cmd.serverTime = level.time;
	ClientThink(client.ps.clientNum);
	// // run the presend to set anything else
	//ClientEndFrame( ent );

	// Clear entity state values.
	bg.PlayerStateToEntityState(client.ps, ent.s);
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

	log('ClientDisconnect: ' + clientNum);

	sv.UnlinkEntity (ent);
	ent.s.modelindex = 0;
	ent.classname = 'disconnected';
	/*ent.client.pers.connected = CON_DISCONNECTED;
	ent.client.ps.persistant[PERS_TEAM] = TEAM_FREE;
	ent.client.sess.sessionTeam = TEAM_FREE;
	trap_SetConfigstring( CS_PLAYERS + clientNum, "");*/
}

/**
 * SetClientViewAngle
 *
 * Set's the actual entitystate angles, as well as the
 * delta_angles of the playerstate, which the client uses
 * to offset it's own predicted angles when rendering.
 */
function SetClientViewAngle(ent, angles) {
	// Set the delta angle.
	for (var i = 0; i < 3; i++) {
		var cmdAngle = AngleToShort(angles[i]);
		ent.client.ps.delta_angles[i] = cmdAngle - ent.client.pers.cmd.angles[i];
	}
	vec3.set(angles, ent.s.angles);
	vec3.set(ent.s.angles, ent.client.ps.viewangles);
}

/**
 * SelectNearestDeathmatchSpawnPoint
 */
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

/**
 * SelectRandomDeathmatchSpawnPoint
 */
function SelectRandomDeathmatchSpawnPoint() {
	var spawnpoints = FindEntity('classname', 'info_player_deathmatch');
	return spawnpoints[Math.floor(Math.random()*spawnpoints.length)];
}