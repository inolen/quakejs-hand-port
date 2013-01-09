var playerMins = vec3.createFrom(-15, -15, -24);
var playerMaxs = vec3.createFrom(15, 15, 32);

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
	var ent = level.gentities[clientNum] = new GameEntity();
	var client = level.clients[clientNum] = new GameClient();
	var userinfo = sv.GetUserinfo(clientNum);

	ent.inuse = true;
	ent.s.number = clientNum;
	ent.client = client;
	client.ps.clientNum = clientNum;
	client.pers.connected = CON.CONNECTING;

	// Read or initialize the session data.
	if (firstTime || level.newSession) {
		InitSessionData(client, userinfo);
	}
	ReadSessionData(client);

	// Get and distribute relevent parameters.
	ClientUserinfoChanged(clientNum);

	// Don't do the "xxx connected" messages if they were caried over from previous level
	if (firstTime) {
		sv.SendServerCommand(null, 'print', client.pers.netname + ' connected');
	}

	if (g_gametype() >= GT.TEAM && client.sess.sessionTeam !== TEAM.SPECTATOR) {
		BroadcastTeamChange(null, client);
	}

	// Count current clients and rank for scoreboard.
	CalculateRanks();
}

/**
 *
 * ClientUserinfoChanged
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

	if (ent.linked) {
		sv.UnlinkEntity(ent);
	}

	ent.touch = 0;
	ent.pain = 0;

	client.pers.connected = CON.CONNECTED;
	client.pers.enterTime = level.time;
	client.pers.teamState.state = TEAM_STATE.BEGIN;

	ClientSpawn(ent);

	if (client.sess.sessionTeam !== TEAM.SPECTATOR) {
		if (g_gametype() !== GT.TOURNAMENT) {
			sv.SendServerCommand(null, 'print', client.pers.netname + ' entered the game');
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

	var spawnOrigin = vec3.create();
	var spawnAngles = vec3.create();

	// Find a spawn point.
	// Do it before setting health back up, so farthest
	// ranging doesn't count this client.
	var spawnPoint;
	if (client.sess.spectatorState !== SPECTATOR.NOT) {
		spawnPoint = SelectSpectatorSpawnPoint(spawnOrigin, spawnAngles, client.sess.arena);
	} else if (g_gametype() >= GT.CTF) {
		// All base oriented team games use the CTF spawn points.
		spawnPoint = SelectCTFSpawnPoint(client.sess.sessionTeam, client.pers.teamState.state,
						spawnOrigin, spawnAngles, client.sess.arena);
	} else {
		// Don't spawn near existing origin if possible.
		spawnPoint = SelectSpawnPoint(client.ps.origin, spawnOrigin, spawnAngles, client.sess.arena);
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
	var savedPing = client.ps.ping;
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
	client.ps.ping = savedPing;
	client.accuracy_hits = savedAccuracyHits;
	client.accuracy_shots = savedAccuracyShots;
	client.ps.clientNum = ent.s.number;
	client.ps.eventSequence = savedEventSequence;
	client.lastkilled_client = -1;

	// Increment the spawncount so the client will detect the respawn.
	client.ps.persistant[PERS.SPAWN_COUNT]++;
	client.ps.persistant[PERS.TEAM] = client.sess.sessionTeam;
	client.ps.persistant[PERS.SPECTATOR_STATE] = client.sess.spectatorState;

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
	ent.die = PlayerDie;
	ent.waterlevel = 0;
	ent.watertype = 0;
	ent.flags = 0;

	vec3.set(playerMins, ent.mins);
	vec3.set(playerMaxs, ent.maxs);

	// Set starting resources based on gametype.
	if (g_gametype() === GT.CLANARENA) {
		client.ps.stats[STAT.WEAPONS] = (1 << WP.GAUNTLET);
		client.ps.stats[STAT.WEAPONS] |= (1 << WP.MACHINEGUN);
		client.ps.stats[STAT.WEAPONS] |= (1 << WP.SHOTGUN);
		client.ps.stats[STAT.WEAPONS] |= (1 << WP.GRENADE_LAUNCHER);
		client.ps.stats[STAT.WEAPONS] |= (1 << WP.ROCKET_LAUNCHER);
		client.ps.stats[STAT.WEAPONS] |= (1 << WP.LIGHTNING);
		client.ps.stats[STAT.WEAPONS] |= (1 << WP.RAILGUN);
		client.ps.stats[STAT.WEAPONS] |= (1 << WP.PLASMAGUN);

		client.ps.ammo[WP.GAUNTLET] = -1;
		client.ps.ammo[WP.MACHINEGUN] = -1;
		client.ps.ammo[WP.SHOTGUN] = -1;
		client.ps.ammo[WP.GRENADE_LAUNCHER] = -1;
		client.ps.ammo[WP.ROCKET_LAUNCHER] = -1;
		client.ps.ammo[WP.LIGHTNING] = -1;
		client.ps.ammo[WP.RAILGUN] = -1;
		client.ps.ammo[WP.PLASMAGUN] = -1;

		// Select the RL by default.
		client.ps.weapon = WP.ROCKET_LAUNCHER;

		// Start with 100/100.
		ent.health = client.ps.stats[STAT.HEALTH] = client.ps.stats[STAT.MAX_HEALTH];
		client.ps.stats[STAT.ARMOR] = client.ps.stats[STAT.MAX_HEALTH];
	} else {
		client.ps.stats[STAT.WEAPONS] = (1 << WP.GAUNTLET);
		client.ps.stats[STAT.WEAPONS] |= (1 << WP.MACHINEGUN);

		client.ps.ammo[WP.GAUNTLET] = -1;
		if (g_gametype() === GT.TEAM) {
			client.ps.ammo[WP.MACHINEGUN] = 50;
		} else {
			client.ps.ammo[WP.MACHINEGUN] = 100;
		}

		client.ps.weapon = WP.MACHINEGUN;

		// Health will count down towards max_health.
		ent.health = client.ps.stats[STAT.HEALTH] = client.ps.stats[STAT.MAX_HEALTH] + 25;
	}
	client.ps.weaponState = WS.READY;

	SetOrigin(ent, spawnOrigin);
	vec3.set(spawnOrigin, client.ps.origin);
	SetClientViewAngle(ent, spawnAngles);

	sv.GetUserCmd(client.ps.clientNum, ent.client.pers.cmd);

	// The respawned flag will be cleared after the attack and jump keys come up.
	client.ps.pm_flags |= PMF.RESPAWNED;

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
		if (ent.client.sess.spectatorState === SPECTATOR.NOT) {
			KillBox(ent);

			// Fire the targets of the spawn point.
			UseTargets(spawnPoint, ent);

			// Select the highest weapon number available, after any spawn given items have fired.
			if (g_gametype() !== GT.CLANARENA) {
				for (var i = WP.NUM_WEAPONS - 1; i > 0; i--) {
					if (client.ps.stats[STAT.WEAPONS] & (1 << i)) {
						client.ps.weapon = i;
						break;
					}
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
	CopyToBodyQueue(ent);
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
	ent.client.ps.persistant[PERS.SPECTATOR_STATE] = SPECTATOR.NOT;
	ent.client.sess.sessionTeam = TEAM.FREE;

	sv.SetConfigstring('player' + clientNum, null);

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
 * SetArena
 */
function SetArena(ent, arena) {
	var client = ent.client;
	var clientNum = ent.s.number;
	var oldTeam = client.sess.sessionTeam;

	client.sess.arena = arena;

	if (g_teamAutoJoin()) {
		client.sess.sessionTeam = PickTeam(client.sess.arena, null);
	} else {
		client.sess.sessionTeam = TEAM.SPECTATOR;
	}

	BroadcastTeamChange(oldTeam, client);
	ClientUserinfoChanged(clientNum);

	ClientBegin(ent.s.number);
}

/**
 * SetTeam
 */
function SetTeam(ent, teamName) {
	var client = ent.client;
	var clientNum = ent.s.number;

	//
	// See what change is requested
	//
	var team;
	var specState = SPECTATOR.NOT;
	var specClient = 0;

	if (teamName === 'scoreboard' || teamName === 'score') {
		team = TEAM.SPECTATOR;
		specState = SPECTATOR.SCOREBOARD;
	} else if (teamName === 'follow1') {
		team = TEAM.SPECTATOR;
		specState = SPECTATOR.FOLLOW;
		specClient = -1;
	} else if (teamName === 'follow2') {
		team = TEAM.SPECTATOR;
		specState = SPECTATOR.FOLLOW;
		specClient = -2;
	} else if (teamName === 'spectator' || teamName === 's') {
		team = TEAM.SPECTATOR;
		specState = SPECTATOR.FREE;
	} else if (g_gametype() >= GT.TEAM) {
		// If running a team game, assign player to one of the teams.
		specState = SPECTATOR.NOT;
		if (teamName === 'red' || teamName === 'r') {
			team = TEAM.RED;
		} else if (teamName === 'blue' || teamName === 'b') {
			team = TEAM.BLUE;
		} else {
			// Pick the team with the least number of players.
			team = PickTeam(client.sess.arena, clientNum);
		}

		// if (g_teamForceBalance.integer) {
		// 	int		counts[TEAM_NUM_TEAMS];

		// 	counts[TEAM_BLUE] = TeamCount(TEAM_BLUE, clientNum);
		// 	counts[TEAM_RED] = TeamCount(TEAM_RED, clientNum);

		// 	// We allow a spread of two
		// 	if ( team == TEAM_RED && counts[TEAM_RED] - counts[TEAM_BLUE] > 1 ) {
		// 		trap_SendServerCommand( clientNum,
		// 			"cp \"Red team has too many players.\n\"" );
		// 		return; // ignore the request
		// 	}
		// 	if ( team == TEAM_BLUE && counts[TEAM_BLUE] - counts[TEAM_RED] > 1 ) {
		// 		trap_SendServerCommand( clientNum,
		// 			"cp \"Blue team has too many players.\n\"" );
		// 		return; // ignore the request
		// 	}

		// 	// It's ok, the team we are switching to has less or same number of players
		// }

	} else {
		// Force them to spectators if there aren't any spots free.
		team = TEAM.FREE;
	}

	// Override decision if limiting the players.
	if (g_gametype() === GT.TOURNAMENT && level.numNonSpectatorClients >= 2) {
		team = TEAM.SPECTATOR;
	} else if (g_maxGameClients() > 0 && level.numNonSpectatorClients >= g_maxGameClients()) {
		team = TEAM.SPECTATOR;
	}

	//
	// Decide if we will allow the change.
	//
	var oldTeam = client.sess.sessionTeam;
	if (team === oldTeam && team !== TEAM.SPECTATOR) {
		return;
	}

	//
	// Execute the team change
	//

	// If the player was dead leave the body
	if (client.ps.pm_type === PM.DEAD) {
		CopyToBodyQueue(ent);
	}

	// He starts at 'base'.
	client.pers.teamState.state = TEAM_STATE.BEGIN;
	if (oldTeam !== TEAM.SPECTATOR) {
		// Kill him (makes sure he loses flags, etc).
		ent.flags &= ~GFL.GODMODE;
		client.ps.stats[STAT.HEALTH] = ent.health = 0;
		PlayerDie(ent, ent, ent, 100000, MOD.SUICIDE);
	}

	// They go to the end of the line for tournements.
	if (team === TEAM.SPECTATOR && oldTeam !== team) {
		// AddTournamentQueue(client);
	}

	client.sess.sessionTeam = team;
	client.sess.spectatorState = specState;
	client.sess.spectatorClient = specClient;

	client.sess.teamLeader = false;
	if (team === TEAM.RED || team == TEAM.BLUE ) {
		var teamLeader = TeamLeader(team);
		// If there is no team leader or the team leader is a bot and this client is not a bot.
		if (teamLeader == -1/* || (!(g_entities[clientNum].r.svFlags & SVF_BOT) && (g_entities[teamLeader].r.svFlags & SVF_BOT))*/) {
			SetTeamLeader(clientNum, team);
		}
	}
	// Make sure there is a team leader on the team the player came from.
	if (oldTeam === TEAM.RED || oldTeam === TEAM.BLUE) {
		CheckTeamLeader(oldTeam);
	}

	BroadcastTeamChange(oldTeam, client);

	// Get and distribute relevent paramters.
	ClientUserinfoChanged(clientNum);

	ClientBegin(clientNum);
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

/**********************************************************
 *
 * Spawnpoints
 *
 **********************************************************/

/**
 * SelectSpawnPoint
 *
 * Chooses a player start, deathmatch start, etc.
 */
function SelectSpawnPoint_compare(a, b) {
	if (a.dist > b.dist) {
		return -1;
	}
	if (a.dist < b.dist) {
		return 1;
	}
	return 0;
}

function SelectSpawnPoint(avoidPoint, origin, angles, arena) {
	var spawnpoints = FindEntity({ classname: 'info_player_deathmatch' });
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

		// In GT.CLANARENA, only select spawn points from the current arena.
		if (g_gametype() === GT.CLANARENA && spot.arena !== arena) {
			continue;
		}

		var delta = vec3.subtract(spot.s.origin, avoidPoint, vec3.create());
		var dist = vec3.length(delta);

		// Add
		spots.push({ dist: dist, spot: spot });
	}

	if (!spots.length) {
		spot = spawnpoints[0];
		if (!spot) {
			error('Couldn\'t find a spawn point');
		}
	} else {
		// Sort the spawn points by their distance.
		spots.sort(SelectSpawnPoint_compare);

		// Select a random spot from the spawn points furthest away.
		var selection = Math.floor(Math.random() * (spots.length / 2));
		spot = spots[selection].spot;
	}

	vec3.set(spot.s.origin, origin);
	origin[2] += 9;
	vec3.set(spot.s.angles, angles);

	return spot;
}

/**
 * SpotWouldTelefrag
 */
function SpotWouldTelefrag(spot) {
	var mins = vec3.add(spot.s.origin, playerMins, vec3.create());
	var maxs = vec3.add(spot.s.origin, playerMaxs, vec3.create());

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
 * SelectSpectatorSpawnPoint
 */
function SelectSpectatorSpawnPoint(origin, angles, arena) {
	return SelectIntermissionSpawnPoint(origin, angles, arena);
}

/**
 * SelectIntermissionSpawnPoint
 *
 * This is also used for spectator spawns
 */
function SelectIntermissionSpawnPoint(origin, angles, arena) {
	var ent;
	var target;
	var dir = vec3.create();

	// We don't filter by arena here as non-CA intermission points don't have an arena.
	var points = FindEntity({ classname: 'info_player_intermission' });

	var point;
	if (!points.length) {
		point = SelectSpawnPoint(QMath.vec3origin, origin, angles, arena);
	} else {
		var i;
		for (i = 0; i < points.length; i++) {
			point = points[i];

			// Filter by arena.
			if (g_gametype() === GT.CLANARENA && point.arena === arena) {
				break;
			}
		}

		// If we didn't find one matching out specifc arena, use the first one.
		if (i === points.length) {
			point = points[0];
		}

		vec3.set(point.s.origin, origin);
		vec3.set(point.s.angles, angles);

		// If it has a target, look towards it.
		if (point.target) {
			var target = PickTarget(point.target);

			if (target) {
				var dir = vec3.subtract(target.s.origin, origin, vec3.create());
				QMath.VectorToAngles(dir, angles);
			}
		}
	}

	return point;
}

/**********************************************************
 *
 * Body queue
 *
 **********************************************************/

/**
 * InitBodyQueue
 */
function InitBodyQueue() {
	level.bodyQueueIndex = 0;

	for (var i = 0; i < BODY_QUEUE_SIZE; i++) {
		var ent = SpawnEntity();
		ent.classname = 'bodyqueue';
		ent.neverFree = true;

		level.bodyQueue[i] = ent;
	}
}

/**
 * CopyToBodyQue
 *
 * A player is respawning, so make an entity that looks
 * just like the existing corpse to leave behind.
 */
function CopyToBodyQueue(ent) {
	sv.UnlinkEntity(ent);

	// If client is in a nodrop area, don't leave the body.
	var contents = sv.PointContents(ent.s.origin, -1);
	if (contents & CONTENTS.NODROP) {
		return;
	}

	// Grab a body que and cycle to the next one.
	var body = level.bodyQueue[level.bodyQueueIndex];
	level.bodyQueueIndex = (level.bodyQueueIndex + 1) % BODY_QUEUE_SIZE;

	var entityNum = body.s.number;

	// Clone off current entity state.
	ent.s.clone(body.s);

	body.s.eFlags = EF.DEAD;  // clear EF_TALK, etc
	body.s.powerups = 0;  // clear powerups
	body.s.loopSound = 0;  // clear lava burning
	body.s.number = entityNum;
	body.timestamp = level.time;
	body.physicsObject = true;
	body.physicsBounce = 0;  // don't bounce
	if (body.s.groundEntityNum === ENTITYNUM_NONE) {
		body.s.pos.trType = TR.GRAVITY;
		body.s.pos.trTime = level.time;
		vec3.set(ent.client.ps.velocity, body.s.pos.trDelta);
	} else {
		body.s.pos.trType = TR.STATIONARY;
	}
	body.s.event = 0;

	// Change the animation to the last-frame only, so the sequence
	// doesn't repeat again for the body.
	switch (body.s.legsAnim & ~ANIM_TOGGLEBIT) {
		case ANIM.BOTH_DEATH1:
		case ANIM.BOTH_DEAD1:
			body.s.torsoAnim = body.s.legsAnim = ANIM.BOTH_DEAD1;
			break;
		case ANIM.BOTH_DEATH2:
		case ANIM.BOTH_DEAD2:
			body.s.torsoAnim = body.s.legsAnim = ANIM.BOTH_DEAD2;
			break;
		case ANIM.BOTH_DEATH3:
		case ANIM.BOTH_DEAD3:
		default:
			body.s.torsoAnim = body.s.legsAnim = ANIM.BOTH_DEAD3;
			break;
	}

	body.svFlags = ent.svFlags;
	vec3.set(ent.mins, body.mins);
	vec3.set(ent.maxs, body.maxs);
	vec3.set(ent.absmin, body.absmin);
	vec3.set(ent.absmax, body.absmax);

	body.clipmask = CONTENTS.SOLID | CONTENTS.PLAYERCLIP;
	body.contents = CONTENTS.CORPSE;
	body.ownerNum = ent.s.number;

	body.nextthink = level.time + 5000;
	body.think = BodySink;
	body.die = BodyDie;

	// Don't take more damage if already gibbed.
	if (ent.health <= GIB_HEALTH) {
		body.takeDamage = false;
	} else {
		body.takeDamage = true;
	}

	vec3.set(body.s.pos.trBase, body.currentOrigin);
	sv.LinkEntity(body);
}

/**
 * BodySink
 *
 * After sitting around for five seconds, fall into the ground and dissapear
 */
function BodySink(ent) {
	if (level.time - ent.timestamp > 6500) {
		// The body ques are never actually freed, they are just unlinked.
		sv.UnlinkEntity(ent);
		ent.physicsObject = false;
		return;
	}
	ent.nextthink = level.time + 100;
	ent.s.pos.trBase[2] -= 1;
}

/**
 * BodyDie
 */
function BodyDie(self, inflictor, attacker, damage, meansOfDeath) {
	if (self.health > GIB_HEALTH) {
		return;
	}

	// if (!g_blood.integer) {
	// 	self.health = GIB_HEALTH+1;
	// 	return;
	// }

	GibEntity(self, 0);
}