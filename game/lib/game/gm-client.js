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
	ent.s.number = clientNum;
	ent.inuse = true;
	
	/*client.pers.connected = CON_CONNECTING;

	// Read or initialize the session data.
	if (firstTime || level.newSession) {
		G_InitSessionData( client, userinfo );
	}
	G_ReadSessionData( client );*/

	// Get and distribute relevent parameters.
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
 * ClientSpawn
 */
function ClientSpawn(ent) {
	var spawn_origin = [0, 0, 0];
	var spawn_angles = [0, 0, 0];
	
	var client = ent.client;
	var ps = ent.client.ps;

	ent.classname = 'player';
	ent.contents = CONTENTS.BODY;
	ent.takeDamage = true;
	ent.die = Player_Die;
	ent.s.groundEntityNum = ENTITYNUM_NONE;
	vec3.set(playerMins, ent.mins);
	vec3.set(playerMaxs, ent.maxs);

	var spawnpoint = SelectRandomDeathmatchSpawnPoint();
	var spawnorigin = vec3.set(spawnpoint.s.origin, [0, 0, 0]);
	spawnorigin[2] += 9;

	SetOrigin(ent, spawnorigin);
	vec3.set(spawnorigin, ps.origin);
	vec3.set(ps.velocity, [0, 0, 0]);

	// The respawned flag will be cleared after the attack and jump keys come up.
	client.ps.pm_flags |= PMF.RESPAWNED;

	sv.GetUserCmd(client.ps.clientNum, ent.client.pers.cmd);
	SetClientViewAngle(ent, spawnpoint.s.angles);

	// Don't allow full run speed for a bit.
	client.ps.pm_flags |= PMF.TIME_KNOCKBACK;
	client.ps.pm_time = 100;

	client.respawnTime = level.time;
	
	// Set max health.
// 	client.pers.maxHealth = atoi( Info_ValueForKey( userinfo, "handicap" ) );
// 	if ( client.pers.maxHealth < 1 || client.pers.maxHealth > 100 ) {
		client.pers.maxHealth = 100;
// 	}
	// Clear entity values.
	client.ps.stats[STAT.MAX_HEALTH] = client.pers.maxHealth;
// 	client.ps.eFlags = flags;
	
	// Set default animations.
	ps.torsoAnim = ANIM.TORSO_STAND;
	ps.legsAnim = ANIM.LEGS_IDLE;

	// Set default weapons
	client.ps.weapon = WP.MACHINEGUN;
	client.ps.stats[STAT.WEAPONS] = (1 << WP.MACHINEGUN);
	client.ps.ammo[WP.MACHINEGUN] = 100;
	client.ps.stats[STAT.WEAPONS] |= (1 << WP.GAUNTLET);
	client.ps.ammo[WP.GAUNTLET] = -1;
	
	// Health will count down towards max_health
	ent.health = client.ps.stats[STAT.HEALTH] = client.ps.stats[STAT.MAX_HEALTH] + 25;
	
// 	G_SetOrigin( ent, spawn_origin );
// 	VectorCopy( spawn_origin, client->ps.origin );
	
	// the respawned flag will be cleared after the attack and jump keys come up
	client.ps.pm_flags |= PMF.RESPAWNED;
	
// 	trap_GetUsercmd( client - level.clients, &ent->client->pers.cmd );
// 	SetClientViewAngle( ent, spawn_angles );
	// don't allow full run speed for a bit
	client.ps.pm_flags |= PMF.TIME_KNOCKBACK;
	client.ps.pm_time = 100;
	
	client.respawnTime = level.time;
	client.inactivityTime = level.time + g_inactivity() * 1000;
	client.latched_buttons = 0;
	
	// set default animations
	client.ps.torsoAnim = ANIM.TORSO_STAND;
	client.ps.legsAnim = ANIM.LEGS_IDLE;
	
	if (!level.intermissiontime) {
		if (ent.client.sess.sessionTeam != TEAM.SPECTATOR) {
// 			G_KillBox(ent);
			// force the base weapon up
			client.ps.weapon = WP.MACHINEGUN;
			client.ps.weaponstate = WS.READY;
			// fire the targets of the spawn point
// 			G_UseTargets(spawnPoint, ent);
			// select the highest weapon number available, after any spawn given items have fired
			client.ps.weapon = 1;
			
			for (var i = WP.NUM_WEAPONS - 1; i > 0; i--) {
				if (client.ps.stats[STAT.WEAPONS] & (1 << i)) {
					client.ps.weapon = i;
					break;
				}
			}
			
			// positively link the client, even if the command times are weird
// 			VectorCopy(ent.client.ps.origin, ent.r.currentOrigin);
			
// 			tent = G_TempEntity(ent.client.ps.origin, EV.PLAYER_TELEPORT_IN);
// 			tent.s.clientNum = ent.s.clientNum;
			
// 			trap_LinkEntity (ent);
		}
	} else {
		// move players to intermission
		MoveClientToIntermission(ent);
	}
	
	// Run a client frame to drop exactly to the floor,
	// initialize weapon, animations and other things.
	client.ps.commandTime = level.time - 100;
	client.pers.cmd.serverTime = level.time;
	ClientThink(client.ps.clientNum);

	// Run the presend to set anything else.
	ClientEndFrame(ent);

	// Clear entity state values.
	bg.PlayerStateToEntityState(client.ps, ent.s);
}

/**
 * ClientRespawn
 */
function ClientRespawn(ent) {
	// CopyToBodyQue(ent);
	ClientSpawn(ent);
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
	ent.s.modelIndex = 0;
	ent.classname = 'disconnected';
	/*ent.client.pers.connected = CON_DISCONNECTED;
	ent.client.ps.persistant[PERS.TEAM] = TEAM_FREE;
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
		var cmdAngle = QMath.AngleToShort(angles[i]);
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

/**
 * GetClientPlayerstate
 *
 * Called by the server.
 */
function GetClientPlayerstate(clientNum) {
	var client = level.clients[clientNum];
	return client.ps;
}
