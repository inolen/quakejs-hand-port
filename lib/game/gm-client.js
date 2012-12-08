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
 * firstTime will be true the very first time a client connects
 * to the server machine, but false on map changes and tournement
 * restarts.
 */
function ClientConnect(clientNum, firstTime) {
	var client = level.clients[clientNum] = new GameClient();
	var ent = level.gentities[clientNum] = new GameEntity();
	var userinfo = sv.GetUserinfo(clientNum);

	ent.client = client;
	ent.s.number = clientNum;
	ent.inuse = true;
	
	client.pers.connected = CON.CONNECTING;
	
	// Read or initialize the session data.
	if (firstTime || level.newSession) {
		InitSessionData(client, userinfo);
	}
	ReadSessionData(client);

	// Get and distribute relevent parameters.
	log('ClientConnect ' + clientNum);
	ClientUserinfoChanged(clientNum);

	// Don't do the "xxx connected" messages if they were caried over from previous level
	if (firstTime) {
		// sv.SendServerCommand(-1, 'print \"' + client.pers.netname + ' connected\n\"');
	}

	if (g_gametype() >= GT.TEAM && client.sess.sessionTeam !== TEAM.SPECTATOR) {
		BroadcastTeamChange(client, -1);
	}
	
	// Count current clients and rank for scoreboard.
	CalculateRanks();
	
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
	var client = level.clients[clientNum];
	var flags;
	
	if (ent.linked) {
		sv.UnlinkEntity(ent);
	}
	
// 	G_InitGentity( ent );
	
	ent.inuse = true;
	ent.s.number = clientNum;
	ent.client.ps.clientNum = clientNum;

	console.log('ClientBegin', ent.s.number);
	
	ent.touch = 0;
	ent.pain = 0;
	ent.client = client;
	
	client.pers.connected = CON.CONNECTED;
	client.pers.enterTime = level.time;
	client.pers.teamState.state = TEAM_STATE.BEGIN;
	
	ClientSpawn(ent);
	
	if (client.sess.sessionTeam != TEAM.SPECTATOR) {
		if (g_gametype() != GT.TOURNAMENT) {
//			trap_SendServerCommand( -1, va("print \"%s" S_COLOR_WHITE " entered the game\n\"", client->pers.netname) );
			log(client.pers.netname + ' entered the game');
		}
	}
	
	// Count current clients and rank for scoreboard.
	CalculateRanks();
}

/**
 * ClientSpawn
 */
function ClientSpawn(ent) {
	var client = ent.client;
	var ps = ent.client.ps;

	var spawnOrigin = [0, 0, 0];
	var spawnAngles = [0, 0, 0];

	// Find a spawn point.
	// Do it before setting health back up, so farthest
	// ranging doesn't count this client.
	var spawnPoint;
	if (client.sess.sessionTeam === TEAM.SPECTATOR) {
		spawnPoint = SelectSpectatorSpawnPoint(spawnOrigin, spawnAngles);
	// } else if (g_gametype() >= GT.CTF ) {
	// 	// All base oriented team games use the CTF spawn points
	// 	spawnPoint = SelectCTFSpawnPoint( 
	// 					client.sess.sessionTeam, 
	// 					client.pers.teamState.state, 
	// 					spawnOrigin, spawnAngles);
	} else {
		// Don't spawn near existing origin if possible.
		spawnPoint = SelectSpawnPoint(client.ps.origin, spawnOrigin, spawnAngles);
	}
	client.pers.teamState.state = TEAM_STATE.ACTIVE;

	// Toggle the teleport bit so the client knows to not lerp
	// and never clear the voted flag.
	var flags = ent.client.ps.eFlags & (EF.TELEPORT_BIT | EF.VOTED | EF.TEAMVOTED);
	flags ^= EF.TELEPORT_BIT;

	// Clear all the non-persistant data.
	var savedPers = client.pers.clone();
	var savedSess = client.sess.clone();
	var savedPsPers = new Array(MAX_PERSISTANT);
	for (var i = 0; i < MAX_PERSISTANT; i++) {
		savedPsPers[i] = client.ps.persistant[i];
	}
	// var savedPing = client.ps.ping;
	var savedAccuracyHits = client.accuracy_hits;
	var savedAccuracyShots = client.accuracy_shots;
	var savedEventSequence = client.ps.eventSequence;

	client.reset();

	// Restore persistant data.
	savedPers.clone(client.pers);
	savedSess.clone(client.sess);
	for (var i = 0; i < MAX_PERSISTANT; i++) {
		client.ps.persistant[i] = savedPsPers[i];
	}
	// client.ps.ping = savedPing;
	client.accuracy_hits = savedAccuracyHits;
	client.accuracy_shots = savedAccuracyShots;
	client.ps.clientNum = ent.s.number;
	client.ps.eventSequence = savedEventSequence;
	client.lastkilled_client = -1;

	// Increment the spawncount so the client will detect the respawn.
	client.ps.persistant[PERS.SPAWN_COUNT]++;
	client.ps.persistant[PERS.TEAM] = client.sess.sessionTeam;

	client.airOutTime = level.time + 12000;

	// var userinfo = sv.GetUserinfo(ent.s.number);
	// // Set max health.
	// client.pers.maxHealth = userinfo.handicap;
	// if ( client.pers.maxHealth < 1 || client.pers.maxHealth > 100 ) {
		client.pers.maxHealth = 100;
	// }
	// Clear entity values.
	client.ps.stats[STAT.MAX_HEALTH] = client.pers.maxHealth;
	client.ps.eFlags = flags;

	ent.s.groundEntityNum = ENTITYNUM_NONE;
	ent.client = level.clients[ent.s.number];
	ent.takeDamage = true;
	ent.inuse = true;
	ent.classname = 'player';
	ent.contents = CONTENTS.BODY;
	ent.clipmask = MASK.PLAYERSOLID;
	ent.die = Player_Die;
	ent.waterlevel = 0;
	ent.watertype = 0;
	ent.flags = 0;
	
	vec3.set(playerMins, ent.mins);
	vec3.set(playerMaxs, ent.maxs);

	client.ps.stats[STAT.WEAPONS] = (1 << WP.MACHINEGUN);
	if (g_gametype() === GT.TEAM) {
		client.ps.ammo[WP.MACHINEGUN] = 50;
	} else {
		client.ps.ammo[WP.MACHINEGUN] = 100;
	}

	client.ps.stats[STAT.WEAPONS] |= (1 << WP.GAUNTLET);
	client.ps.ammo[WP.GAUNTLET] = -1;
	client.ps.ammo[WP.GRAPPLING_HOOK] = -1;

	// Health will count down towards max_health.
	ent.health = client.ps.stats[STAT.HEALTH] = client.ps.stats[STAT.MAX_HEALTH] + 25;

	SetOrigin(ent, spawnOrigin);
	vec3.set(spawnOrigin, client.ps.origin);

	// The respawned flag will be cleared after the attack and jump keys come up.
	client.ps.pm_flags |= PMF.RESPAWNED;

	sv.GetUserCmd(client.ps.clientNum, ent.client.pers.cmd);
	SetClientViewAngle(ent, spawnAngles);

	// Don't allow full run speed for a bit.
	client.ps.pm_flags |= PMF.TIME_KNOCKBACK;
	client.ps.pm_time = 100;

	client.respawnTime = level.time;
	client.inactivityTime = level.time + g_inactivity() * 1000;
	// client.latched_buttons = 0;

	// Set default animations.
	client.ps.torsoAnim = ANIM.TORSO_STAND;
	client.ps.legsAnim = ANIM.LEGS_IDLE;

	if (!level.intermissiontime) {
		if (ent.client.sess.sessionTeam !== TEAM.SPECTATOR) {
			// KillBox(ent);

			// Force the base weapon up
			client.ps.weapon = WP.MACHINEGUN;
			client.ps.weaponState = WS.READY;

			// Fire the targets of the spawn point.
			UseTargets(spawnPoint, ent);

			// Select the highest weapon number available, after any spawn given items have fired.
			client.ps.weapon = 1;

			for (var i = WP.NUM_WEAPONS - 1; i > 0; i--) {
				if (client.ps.stats[STAT.WEAPONS] & (1 << i)) {
					client.ps.weapon = i;
					break;
				}
			}

			// Positively link the client, even if the command times are weird.
			vec3.set(ent.client.ps.origin, ent.currentOrigin);

			var tent = TempEntity(ent.client.ps.origin, EV.PLAYER_TELEPORT_IN);
			tent.s.clientNum = ent.s.clientNum;
			sv.LinkEntity(ent);
		}
	} else {
		// Move players to intermission.
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

	if (!ent.client || ent.client.pers.connected == CON.DISCONNECTED) {
		return;
	}
	
	log('ClientDisconnect: ' + clientNum);
	
	sv.UnlinkEntity(ent);
	ent.s.modelIndex = 0;
	ent.classname = 'disconnected';
	ent.client.pers.connected = CON.DISCONNECTED;
	ent.client.ps.persistant[PERS.TEAM] = TEAM.FREE;
	ent.client.sess.sessionTeam = TEAM.FREE;
	
// 	trap_SetConfigstring( CS_PLAYERS + clientNum, "");
	
	CalculateRanks();
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
 * SelectSpectatorSpawnPoint
 */
function SelectSpectatorSpawnPoint(origin, angles) {
	FindIntermissionPoint();

	vec3.set(level.intermissionOrigin, origin);
	vec3.set(level.intermissionAngles, angles);

	return null;
}

/**
 * SelectSpawnPoint
 *
 * Chooses a player start, deathmatch start, etc.
 */
function SelectSpawnPoint_compare(a, b) {
	if (a.dist < b.dist) {
		return -1;
	}
	if (a.dist > b.dist) {
		return 1;
	}
	return 0;
}

function SelectSpawnPoint(avoidPoint, origin, angles) {
	var spawnpoints = FindEntity('classname', 'info_player_deathmatch');
	var spots = [];
	var spot;

	for (var i = 0; i < spawnpoints.length; i++) {
		spot = spawnpoints[i];

		if (SpotWouldTelefrag(spot)) {
			continue;
		}

		if (/*((spot.flags & GFL.NO_BOTS) && isbot) ||*/
		   ((spot.flags & GFL.NO_HUMANS)/* && !isbot*/)) {
			continue;
		}

		var delta = vec3.subtract(spot.s.origin, avoidPoint, [0, 0, 0]);
		var dist = vec3.length(delta);

		// Add 
		spots.push({ dist: dist, spot: spot });
	}

	// Sort the spawn points by their distance.
	spots.sort(SelectSpawnPoint_compare);

	// Select a random spot from the spawn points furthest away.
	var selection = Math.floor(Math.random() * (spawnpoints.length / 2));
	spot = spots[selection].spot;

	vec3.set(spot.s.origin, origin);
	origin[2] += 9;
	vec3.set(spot.s.angles, angles);

	return spot;
}

/**
 * SpotWouldTelefrag
 */
function SpotWouldTelefrag(spot) {
	var mins = vec3.add(spot.s.origin, playerMins, [0, 0, 0]);
	var maxs = vec3.add(spot.s.origin, playerMaxs, [0, 0, 0]);
	
	var entityNums = sv.FindEntitiesInBox(mins, maxs);

	for (var i = 0; i < entityNums.length; i++) {
		var hit = level.gentities[entityNums[i]];

		if (hit.client) {
			return true;
		}
	}

	return false;
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
