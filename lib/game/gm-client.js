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
	client.arenaNum = 0;
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
		'name': client.pers.netname,
		'team': client.sess.sessionTeam
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
 * ClientSpawn
 */
function ClientSpawn(ent) {
	var client = ent.client;
	var ps = ent.client.ps;
	var arena = level.arenas[client.arenaNum];

	var spawnOrigin = vec3.create();
	var spawnAngles = vec3.create();

	// If in CA, kick to spectator state if not warming up.
	if (g_gametype() === GT.CLANARENA && arena.warmupTime === WARMUP_OVER) {
		client.sess.spectatorState = SPECTATOR.FREE;
	}

	// Find a spawn point.
	// Do it before setting health back up, so farthest
	// ranging doesn't count this client.
	var spawnPoint;
	if (client.sess.spectatorState !== SPECTATOR.NOT) {
		spawnPoint = SelectSpectatorSpawnPoint(spawnOrigin, spawnAngles, arena.number);
	} else if (g_gametype() >= GT.CTF) {
		// All base oriented team games use the CTF spawn points.
		spawnPoint = SelectCTFSpawnPoint(client.sess.sessionTeam, client.pers.teamState.state,
						spawnOrigin, spawnAngles, arena.number);
	} else {
		// Don't spawn near existing origin if possible.
		spawnPoint = SelectSpawnPoint(client.ps.origin, spawnOrigin, spawnAngles, arena.number);
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
	var savedArena = client.arenaNum;
	var savedAccuracyHits = client.accuracy_hits;
	var savedAccuracyShots = client.accuracy_shots;
	var savedEventSequence = client.ps.eventSequence;
	var savedPing = client.ps.ping;

	client.reset();

	// Restore persistant data.
	savedPers.clone(client.pers);
	savedSess.clone(client.sess);
	for (var i = 0; i < MAX_PERSISTANT; i++) {
		client.ps.persistant[i] = savedPsPers[i];
	}
	client.arenaNum = savedArena;
	client.accuracy_hits = savedAccuracyHits;
	client.accuracy_shots = savedAccuracyShots;
	client.ps.ping = savedPing;
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
 * RunClient
 */
function RunClient(ent) {
	if (!g_synchronousClients()) {
		return;
	}

	ent.client.pers.cmd.serverTime = level.time;
	ClientThink_real(ent);
}

/**
 * ClientThink
 *
 * A new command has arrived from the client.
 */
function ClientThink(clientNum) {
	var ent = level.gentities[clientNum];

	// Grab the latest command.
	sv.GetUserCmd(clientNum, ent.client.pers.cmd);

	// Mark the time we got info, so we can display the
	// phone jack if they don't get any for a while.
	ent.client.lastCmdTime = level.time;

	// If we're running the synchronous ClientThink,
	// early out after we have stored off the latest
	// user cmd.
	if (g_synchronousClients()) {
		return;
	}

	ClientThink_real(ent);
}

/**
 * ClientThink_real
 *
 * This will be called once for each client frame, which will
 * usually be a couple times for each server frame on fast clients.
 *
 * If "g_synchronousClients 1" is set, this will be called exactly
 * once for each server frame, which makes for smooth demo recording.
 */
function ClientThink_real(ent) {
	var client = ent.client;
	var cmd = client.pers.cmd;

	// Sanity check the command time to prevent speedup cheating.
	if (cmd.serverTime > level.time + 200) {
		cmd.serverTime = level.time + 200;
	}
	if (cmd.serverTime < level.time - 1000) {
		cmd.serverTime = level.time - 1000;
	}

	// Following others may result in bad times, but we still want
	// to check for follow toggles.
	var msec = cmd.serverTime - client.ps.commandTime;
	if (msec < 1 && client.sess.spectatorState !== SPECTATOR.FOLLOW) {
		return;
	} else if (msec > 200) {
		msec = 200;
	}

	if (pmove_msec() < 8) {
		pmove_msec(8);
	} else if (pmove_msec() > 33) {
		pmove_msec(33);
	}

	if (pmove_fixed()) {
		cmd.serverTime = ((cmd.serverTime + pmove_msec() - 1) / pmove_msec()) * pmove_msec();
	}

	// // Check for exiting intermission.
	if (level.intermissiontime) {
		ClientIntermissionThink(client);
		return;
	}

	// Spectators don't do much.
	if (client.sess.spectatorState !== SPECTATOR.NOT) {
		if (client.sess.spectatorState === SPECTATOR.SCOREBOARD) {
			return;
		}
		ClientSpectatorThink(ent, cmd);
		return;
	}

	// // Check for inactivity timer, but never drop the local client of a non-dedicated server.
	// if (!ClientInactivityTimer(client)) {
	// 	return;
	// }

	// Clear the rewards if time.
	if (level.time > client.rewardTime) {
		client.ps.eFlags &= ~(EF.AWARD_IMPRESSIVE | EF.AWARD_EXCELLENT | EF.AWARD_GAUNTLET | EF.AWARD_ASSIST | EF.AWARD_DEFEND | EF.AWARD_CAP);
	}

	// Set pmove type.
	if (client.noclip) {
		client.ps.pm_type = PM.NOCLIP;
	} else if (client.ps.stats[STAT.HEALTH] <= 0) {
		client.ps.pm_type = PM.DEAD;
	} else {
		client.ps.pm_type = PM.NORMAL;
	}

	client.ps.gravity = g_gravity();
	client.ps.speed = g_speed();
	if (client.ps.powerups[PW.HASTE]) {
		client.ps.speed *= 1.3;
	}

	// Disable attacks during CA warmup.
	if (g_gametype() === GT.CLANARENA) {
		var arena = level.arenas[client.arenaNum];
		if (arena.warmupTime !== 0) {
			client.ps.pm_flags |= PMF.NO_ATTACK;
		} else {
			client.ps.pm_flags &= ~PMF.NO_ATTACK;
		}
	}

	// Setup for pmove.
	var oldEventSequence = client.ps.eventSequence;
	var pm = new bg.PmoveInfo();
	pm.ps = client.ps;
	cmd.clone(pm.cmd);
	pm.trace = sv.Trace;
	pm.pointContents = sv.PointContents;
	pm.pmove_fixed = pmove_fixed();
	pm.pmove_msec = pmove_msec();

	if (pm.ps.pm_type === PM.DEAD) {
		pm.tracemask = MASK.PLAYERSOLID & ~CONTENTS.BODY;
	} else {
		pm.tracemask = MASK.PLAYERSOLID;
	}

	// Check for the hit-scan gauntlet, don't let the action
	// go through as an attack unless it actually hits something.
	if (client.ps.weapon === WP.GAUNTLET && !(client.ps.pm_flags & PMF.NO_ATTACK) &&
		!(cmd.buttons & BUTTON.TALK) && (cmd.buttons & BUTTON.ATTACK) &&
		client.ps.weaponTime <= 0) {
		pm.gauntletHit = CheckGauntletAttack(ent);
	}
	if (ent.flags & GFL.FORCE_GESTURE) {
		ent.flags &= ~GFL.FORCE_GESTURE;
		client.pers.cmd.buttons |= BUTTON.GESTURE;
	}

	// Copy off position before pmove.
	vec3.set(client.ps.origin, client.oldOrigin);

	bg.Pmove(pm);

	// Save results of pmove.
	if (client.ps.eventSequence !== oldEventSequence) {
		ent.eventTime = level.time;
	}
	bg.PlayerStateToEntityState(client.ps, ent.s);
	// SendPendingPredictableEvents(client.ps);

	// Update game entity info.
	// Use the snapped origin for linking so it matches client predicted versions
	vec3.set(ent.s.pos.trBase, ent.currentOrigin);
	vec3.set(pm.mins, ent.mins);
	vec3.set(pm.maxs, ent.maxs);
	ent.waterlevel = pm.waterlevel;
	ent.watertype = pm.watertype;

	// Execute client events.
	ClientEvents(ent, oldEventSequence);

	// Link entity now, after any personal teleporters have been used.
	sv.LinkEntity(ent);

	if (!client.noclip) {
		TouchTriggers(ent);
	}

	// NOTE: Now copy the exact origin over otherwise clients can be snapped into solid.
	vec3.set(client.ps.origin, ent.currentOrigin);

	// Touch other objects.
	ClientImpacts(ent, pm);

	// Save results of triggers and client events.
	if (client.ps.eventSequence != oldEventSequence) {
		ent.eventTime = level.time;
	}

	// // Swap and latch button actions.
	// client.oldbuttons = client.buttons;
	// client.buttons = ucmd.buttons;
	// client.latched_buttons |= client.buttons & ~client.oldbuttons;

	// Check for respawning.
	if (client.ps.pm_type === PM.DEAD) {
		// Wait for the attack button to be pressed.
		if (level.time > client.respawnTime) {
			// Forcerespawn is to prevent users from waiting out powerups.
			if (g_forcerespawn() > 0 &&
				(level.time - client.respawnTime) > g_forcerespawn() * 1000) {
				ClientRespawn(ent);
				return;
			}

			// Pressing attack or use is the normal respawn method
			if (cmd.buttons & (BUTTON.ATTACK | BUTTON.USE_HOLDABLE)) {
				ClientRespawn(ent);
			}
		}
		return;
	}
}

/**
 * ClientIntermissionThink
 */
function ClientIntermissionThink(client) {
	client.ps.eFlags &= ~EF.TALK;
	client.ps.eFlags &= ~EF.FIRING;

	// the level will exit when everyone wants to or after timeouts

	// swap and latch button actions
	client.oldbuttons = client.buttons;
	client.buttons = client.pers.cmd.buttons;
	if (client.buttons & (BUTTON.ATTACK | BUTTON.USE_HOLDABLE) & (client.oldbuttons ^ client.buttons)) {
		// this used to be an ^1 but once a player says ready, it should stick
		client.readyToExit = 1;
	}
}

/**
 * ClientSpectatorThink
 */
function ClientSpectatorThink(ent, ucmd) {
	var client = ent.client;

	if (client.sess.spectatorState !== SPECTATOR.FOLLOW) {
		client.ps.pm_type = PM.SPECTATOR;
		client.ps.speed = 400;  // faster than normal

		// Set up for pmove.
		var pm = new bg.PmoveInfo();
		pm.ps = client.ps;
		ucmd.clone(pm.cmd);
		pm.tracemask = MASK.PLAYERSOLID & ~CONTENTS.BODY;  // spectators can fly through bodies
		pm.trace = sv.Trace;
		pm.pointContents = sv.PointContents;

		// Perform a pmove.
		bg.Pmove(pm);

		// Save results of pmove.
		vec3.set(client.ps.origin, ent.s.origin);

		TouchTriggers(ent);
		sv.UnlinkEntity(ent);
	}

	// client.oldbuttons = client.buttons;
	// client.buttons = ucmd.buttons;

	// // attack button cycles through spectators
	// if ( ( client.buttons & BUTTON_ATTACK ) && ! ( client.oldbuttons & BUTTON_ATTACK ) ) {
	// 	Cmd_FollowCycle_f( ent, 1 );
	// }
}

/**
 * ClientEvents
 *
 * Events will be passed on to the clients for presentation,
 * but any server game effects are handled here.
 */
function ClientEvents(ent, oldEventSequence) {
	var client = ent.client;

	if (oldEventSequence < client.ps.eventSequence - MAX_PS_EVENTS) {
		oldEventSequence = client.ps.eventSequence - MAX_PS_EVENTS;
	}
	for (var i = oldEventSequence; i < client.ps.eventSequence; i++) {
		var event = client.ps.events[i & (MAX_PS_EVENTS - 1)];

		switch (event) {
			// case EV_FALL_MEDIUM:
			// case EV_FALL_FAR:
			// 	if ( ent.s.eType != ET_PLAYER ) {
			// 		break;		// not in the player model
			// 	}
			// 	if ( g_dmflags.integer & DF_NO_FALLING ) {
			// 		break;
			// 	}
			// 	if ( event == EV_FALL_FAR ) {
			// 		damage = 10;
			// 	} else {
			// 		damage = 5;
			// 	}
			// 	ent.painDebounceTime = level.time + 200;	// no normal pain sound
			// 	G_Damage (ent, NULL, NULL, NULL, NULL, damage, 0, MOD_FALLING);
			// 	break;

			case EV.FIRE_WEAPON:
				FireWeapon(ent);
				break;

			// case EV_USE_ITEM1:  // teleporter
			// 	// Drop flags in CTF.
			// 	item = NULL;
			// 	j = 0;

			// 	if ( client.ps.powerups[ PW_REDFLAG ] ) {
			// 		item = BG_FindItemForPowerup( PW_REDFLAG );
			// 		j = PW_REDFLAG;
			// 	} else if ( client.ps.powerups[ PW_BLUEFLAG ] ) {
			// 		item = BG_FindItemForPowerup( PW_BLUEFLAG );
			// 		j = PW_BLUEFLAG;
			// 	} else if ( client.ps.powerups[ PW_NEUTRALFLAG ] ) {
			// 		item = BG_FindItemForPowerup( PW_NEUTRALFLAG );
			// 		j = PW_NEUTRALFLAG;
			// 	}

			// 	if ( item ) {
			// 		drop = Drop_Item( ent, item, 0 );
			// 		// Decide how many seconds it has left.
			// 		drop.count = ( client.ps.powerups[ j ] - level.time ) / 1000;
			// 		if ( drop.count < 1 ) {
			// 			drop.count = 1;
			// 		}

			// 		client.ps.powerups[ j ] = 0;
			// 	}

			// 	SelectSpawnPoint( client.ps.origin, origin, angles, false );
			// 	TeleportPlayer( ent, origin, angles );
			// 	break;

			// case EV_USE_ITEM2:  // medkit
			// 	ent.health = client.ps.stats[STAT.MAX_HEALTH] + 25;
			// 	break;

			default:
				break;
		}
	}
}

/**
 * ClientEndFrame
 *
 * Called at the end of each server frame for each connected client
 * A fast client will have multiple ClientThink for each ClientEndFrame,
 * while a slow client may have multiple ClientEndFrame between ClientThink.
 */
function ClientEndFrame(ent) {
	var client = ent.client;

	if (client.sess.spectatorState !== SPECTATOR.NOT) {
		SpectatorClientEndFrame(ent);
		return;
	}

	// Turn off any expired powerups
	for (var i = 0; i < MAX_POWERUPS; i++) {
		if (client.ps.powerups[i] < level.time) {
			client.ps.powerups[i] = 0;
		}
	}

	if (level.intermissiontime) {
		return;
	}

	// Burn from lava, etc.
	WorldEffects(ent);

	// Apply all the damage taken this frame.
	DamageFeedback(ent);

	// Add the EF.CONNECTION flag if we haven't gotten commands recently.
	if (level.time - client.lastCmdTime > 1000) {
		client.ps.eFlags |= EF.CONNECTION;
	} else {
		client.ps.eFlags &= ~EF.CONNECTION;
	}

	client.ps.stats[STAT.HEALTH] = ent.health;  // FIXME: get rid of ent.health...

	SetClientSound(ent);

	bg.PlayerStateToEntityState(client.ps, ent.s);
	// SendPendingPredictableEvents(client.ps);
}

/**
 * SpectatorClientEndFrame
 */
function SpectatorClientEndFrame(ent) {
	var client = ent.client;

	// If we are doing a chase cam or a remote view, grab the latest info
	if (client.sess.spectatorState === SPECTATOR.FOLLOW) {
		var clientNum = client.sess.spectatorClient;

		// Team follow1 and team follow2 go to whatever clients are playing.
		if (clientNum === -1) {
			clientNum = level.follow1;
		} else if (clientNum === -2) {
			clientNum = level.follow2;
		}

		if (clientNum >= 0) {
			var client = level.clients[clientNum];
			if (client.pers.connected === CON.CONNECTED && client.sess.spectatorState === SPECTATOR.NOT) {
				var flags = (client.ps.eFlags & ~(EF.VOTED | EF.TEAMVOTED)) | (client.ps.eFlags & (EF.VOTED | EF.TEAMVOTED));
				client.ps = client.ps;
				client.ps.pm_flags |= PMF.FOLLOW;
				client.ps.eFlags = flags;
				return;
			} else {
				// Drop them to free spectators unless they are dedicated camera followers.
				if (client.sess.spectatorClient >= 0) {
					client.sess.spectatorState = SPECTATOR.FREE;
					ClientBegin(ent.s.number);
				}
			}
		}
	}

	if (client.sess.spectatorState === SPECTATOR.SCOREBOARD) {
		client.ps.pm_flags |= PMF.SCOREBOARD;
	} else {
		client.ps.pm_flags &= ~PMF.SCOREBOARD;
	}
}

/**
 * SetClientSound
 */
function SetClientSound(ent) {
	// if (ent.waterlevel && (ent.watertype & (CONTENTS.LAVA|CONTENTS.SLIME))) {
	// 	client.ps.loopSound = level.snd_fry;
	// } else {
	// 	client.ps.loopSound = 0;
	// }
}

/**
 * TouchTriggers
 *
 * Find all trigger entities that ent's current position touches.
 * Spectators will only interact with teleporters.
 */
function TouchTriggers(ent) {
	if (!ent.client) {
		return;
	}

	// Dead clients don't activate triggers!
	if (ent.client.pm_type === PM.DEAD) {
		return;
	}

	var ps = ent.client.ps;
	var range = vec3.createFrom(40, 40, 52);
	var mins = vec3.create();
	var maxs = vec3.create();

	vec3.subtract(ps.origin, range, mins);
	vec3.add(ps.origin, range, maxs);

	var entityNums = sv.FindEntitiesInBox(mins, maxs);

	// Can't use ent.absmin, because that has a one unit pad.
	vec3.add(ps.origin, ent.mins, mins);
	vec3.add(ps.origin, ent.maxs, maxs);

	for (var i = 0; i < entityNums.length; i++) {
		var hit = level.gentities[entityNums[i]];

		// If they don't have callbacks.
		if (!hit.touch) {
			continue;
		}

		if (!(hit.contents & CONTENTS.TRIGGER)) {
			continue;
		}

		// Use seperate code for determining if an item is picked up
		// so you don't have to actually contact its bounding box.
		if (hit.s.eType === ET.ITEM) {
			if (!bg.PlayerTouchesItem(ps, hit.s, level.time)) {
				continue;
			}
		} else {
			if (!sv.EntityContact(mins, maxs, hit)) {
				continue;
			}
		}

		hit.touch.call(this, hit, ent);
	}

	// if we didn't touch a jump pad this pmove frame
	if (ps.jumppad_frame != ps.pmove_framecount) {
		ps.jumppad_frame = 0;
		ps.jumppad_ent = 0;
	}
}

/**
 * ClientImpacts
 */
function ClientImpacts(ent, pm) {
	for (var i = 0; i < pm.numTouch; i++) {
		for (var j = 0; j < i; j++) {
			if (pm.touchEnts[j] === pm.touchEnts[i]) {
				break;
			}
		}
		if (j !== i) {
			continue;  // duplicated
		}

		var other = level.gentities[pm.touchEnts[i]];

		// if ((ent.r.svFlags & SVF_BOT) && ent.touch) {
		// 	ent.touch( ent, other, &trace );
		// }

		if (!other.touch) {
			continue;
		}

		other.touch(other, ent, null);
	}
}

/**
 * SetClientViewAngle
 *
 * Set's the actual entitystate angles, as well as the
 * delta_angles of the playerstate, which the client uses
 * to offset it's own predicted angles when rendering.
 */
function SetClientViewAngle(ent, angles) {
	var client = ent.client;

	// Set the delta angle.
	for (var i = 0; i < 3; i++) {
		var cmdAngle = QMath.AngleToShort(angles[i]);
		client.ps.delta_angles[i] = cmdAngle - client.pers.cmd.angles[i];
	}
	vec3.set(angles, ent.s.angles);
	vec3.set(ent.s.angles, client.ps.viewangles);
}

/**
 * SetArena
 */
function SetArena(client, arenaNum) {
	client.arenaNum = arenaNum;

	// Autojoin a team in the new arena.
	SetTeam(client, 'f');
}

/**
 * SetTeam
 */
function SetTeam(client, teamName) {
	var clientNum = client.ps.clientNum;
	var ent = level.gentities[clientNum];
	var arena = level.arenas[client.arenaNum];

	//
	// See what change is requested
	//
	var team;
	var specState = SPECTATOR.NOT;
	var specClient = 0;
	var forcedToSpec = false;

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
	} else {
		// If running a team game, assign player to one of the teams.
		if (teamName === 'red' || teamName === 'r') {
			team = TEAM.RED;
		} else if (teamName === 'blue' || teamName === 'b') {
			team = TEAM.BLUE;
		} else {
			team = PickTeam(arena, clientNum);
		}

		if (team === TEAM.SPECTATOR) {
			specState = SPECTATOR.FREE;
			forcedToSpec = true;
		}
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

	log('Setting team for', clientNum, 'to', team);

	client.sess.sessionTeam = team;
	client.sess.spectatorState = specState;
	client.sess.spectatorClient = specClient;
	client.sess.spectatorNum = -1;

	// If the client was forced to spec, queue them.
	if (client.sess.sessionTeam === TEAM.SPECTATOR && forcedToSpec) {
		PushClientToQueue(arena, client);
	}

	// This is also called by InitSessionData.
	if (client.pers.connected !== CON.CONNECTED) {
		return;
	}

	// If the player was dead leave the body
	if (client.ps.pm_type === PM.DEAD) {
		CopyToBodyQueue(ent);
	}

	if (oldTeam !== TEAM.SPECTATOR) {
		// Kill him (makes sure he loses flags, etc).
		ent.flags &= ~GFL.GODMODE;
		client.ps.stats[STAT.HEALTH] = ent.health = 0;
		PlayerDie(ent, ent, ent, 100000, MOD.SUICIDE);
	}

	// He starts at 'base'.
	client.pers.teamState.state = TEAM_STATE.BEGIN;

	BroadcastTeamChange(oldTeam, client);

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

function SelectSpawnPoint(avoidPoint, origin, angles, arenaNum) {
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
		if (g_gametype() === GT.CLANARENA && spot.arenaNum !== arenaNum) {
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
		var selection = QMath.irrandom(0, Math.floor(spots.length / 2));
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
function SelectSpectatorSpawnPoint(origin, angles, arenaNum) {
	return SelectIntermissionSpawnPoint(origin, angles, arenaNum);
}

/**
 * SelectIntermissionSpawnPoint
 *
 * This is also used for spectator spawns
 */
function SelectIntermissionSpawnPoint(origin, angles, arenaNum) {
	var ent;
	var target;
	var dir = vec3.create();

	// We don't filter by arena here as non-CA intermission points don't have an arena.
	var points = FindEntity({ classname: 'info_player_intermission' });

	var point;
	if (!points.length) {
		point = SelectSpawnPoint(QMath.vec3origin, origin, angles, arenaNum);
	} else {
		var i;
		for (i = 0; i < points.length; i++) {
			point = points[i];

			// Filter by arena.
			if (g_gametype() === GT.CLANARENA && point.arenaNum === arenaNum) {
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

/**
 * TeleportPlayer
 */
function TeleportPlayer(player, origin, angles) {
	var noAngles = (angles[0] > 999999.0);

	// Use temp events at source and destination to prevent the effect
	// from getting dropped by a second player event.
	if (player.client.sess.spectatorState === SPECTATOR.NOT) {
		var tent = TempEntity(player.client.ps.origin, EV.PLAYER_TELEPORT_OUT);
		tent.s.clientNum = player.s.clientNum;

		tent = TempEntity(origin, EV.PLAYER_TELEPORT_IN);
		tent.s.clientNum = player.s.clientNum;
	}

	// Unlink to make sure it can't possibly interfere with KillBox.
	sv.UnlinkEntity(player);

	vec3.set(origin, player.client.ps.origin);
	player.client.ps.origin[2] += 1;

	if (!noAngles) {
		// spit the player out
		QMath.AnglesToVectors(angles, player.client.ps.velocity, null, null);
		vec3.scale(player.client.ps.velocity, 400);
		player.client.ps.pm_time = 160;  // hold time
		player.client.ps.pm_flags |= PMF.TIME_KNOCKBACK;

		// set angles
		SetClientViewAngle(player, angles);
	}

	// Toggle the teleport bit so the client knows to not lerp.
	player.client.ps.eFlags ^= EF.TELEPORT_BIT;

	// Kill anything at the destination.
	if (player.client.sess.spectatorState === SPECTATOR.NOT) {
		KillBox(player);
	}

	// Save results of pmove.
	bg.PlayerStateToEntityState(player.client.ps, player.s);

	// Use the precise origin for linking.
	vec3.set(player.client.ps.origin, player.currentOrigin);

	if (player.client.sess.spectatorState === SPECTATOR.NOT) {
		sv.LinkEntity(player);
	}
}

/**
 * DamageFeedback
 *
 * Called just before a snapshot is sent to the given player.
 * Totals up all damage and generates both the player_state_t
 * damage values to that client for pain blends and kicks, and
 * global pain sound events for all clients.
 */
function DamageFeedback(player) {
	var client = player.client;
	if (client.ps.pm_type === PM.DEAD) {
		return;
	}

	// Total points of damage shot at the player this frame
	var count = client.damage_blood + client.damage_armor;
	if (count === 0) {
		return;   // didn't take any damage
	}
	if (count > 255) {
		count = 255;
	}

	// Send the information to the client.

	// World damage (falling, slime, etc) uses a special code
	// to make the blend blob centered instead of positional.
	if (client.damage_fromWorld) {
		client.ps.damagePitch = 255;
		client.ps.damageYaw = 255;
		client.damage_fromWorld = false;
	} else {
		var angles = vec3.create();
		QMath.VectorToAngles(client.damage_from, angles);
		client.ps.damagePitch = angles[QMath.PITCH]/360.0 * 256;
		client.ps.damageYaw = angles[QMath.YAW]/360.0 * 256;
	}

	// Play an apropriate pain sound.
	if ((level.time > player.painDebounceTime) && !(player.flags & GFL.GODMODE)) {
		player.painDebounceTime = level.time + 700;
		AddEvent(player, EV.PAIN, player.health);
		client.ps.damageEvent++;
	}

	client.ps.damageCount = count;

	// Clear totals.
	client.damage_blood = 0;
	client.damage_armor = 0;
	client.damage_knockback = 0;
}

/**
 * WorldEffects
 *
 * Check for lava / slime contents and drowning.
 */
function WorldEffects(ent) {
	var client = ent.client;

	if (client.noclip) {
		client.airOutTime = level.time + 12000;	// don't need air
		return;
	}

	var waterlevel = ent.waterlevel;
	var envirosuit = client.ps.powerups[PW.BATTLESUIT] > level.time;

	//
	// Check for drowning.
	//
	if (waterlevel === 3) {
		// Envirosuit gives air.
		if (envirosuit) {
			client.airOutTime = level.time + 10000;
		}

		// If out of air, start drowning.
		if (client.airOutTime < level.time) {
			// drown!
			client.airOutTime += 1000;
			if (ent.health > 0) {
				// Take more damage the longer underwater.
				ent.damage += 2;
				if (ent.damage > 15) {
					ent.damage = 15;
				}

				// Don't play a normal pain sound.
				ent.painDebounceTime = level.time + 200;

				Damage(ent, null, null, null, null, ent.damage, DAMAGE.NO_ARMOR, MOD.WATER);
			}
		}
	} else {
		client.airOutTime = level.time + 12000;
		ent.damage = 2;
	}

	//
	// Check for sizzle damage (move to pmove?).
	//
	if (waterlevel &&
		(ent.watertype & (CONTENTS.LAVA|CONTENTS.SLIME))) {
		if (ent.health > 0 && ent.painDebounceTime <= level.time) {
			if (envirosuit) {
				AddEvent( ent, EV.POWERUP_BATTLESUIT, 0);
			} else {
				if (ent.watertype & CONTENTS.LAVA) {
					Damage(ent, null, null, null, null, 30*waterlevel, 0, MOD.LAVA);
				}

				if (ent.watertype & CONTENTS.SLIME) {
					Damage(ent, null, null, null, null, 10*waterlevel, 0, MOD.SLIME);
				}
			}
		}
	}
}