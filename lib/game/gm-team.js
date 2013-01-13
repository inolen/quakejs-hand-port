var CTF_CAPTURE_BONUS                  = 5;                // what you get for capture
var CTF_TEAM_BONUS                     = 0;                // what your team gets for capture
var CTF_RECOVERY_BONUS                 = 1;                // what you get for recovery
var CTF_FLAG_BONUS                     = 0;                // what you get for picking up enemy flag
var CTF_FRAG_CARRIER_BONUS             = 2;                // what you get for fragging enemy flag carrier
var CTF_FLAG_RETURN_TIME               = 40000;            // seconds until auto return

var CTF_CARRIER_DANGER_PROTECT_BONUS   = 2;                // bonus for fraggin someone who has recently hurt your flag carrier
var CTF_CARRIER_PROTECT_BONUS          = 1;                // bonus for fraggin someone while either you or your target are near your flag carrier
var CTF_FLAG_DEFENSE_BONUS             = 1;                // bonus for fraggin someone while either you or your target are near your flag
var CTF_RETURN_FLAG_ASSIST_BONUS       = 1;                // awarded for returning a flag that causes a capture to happen almost immediately
var CTF_FRAG_CARRIER_ASSIST_BONUS      = 2;                // award for fragging a flag carrier if a capture happens almost immediately

var CTF_TARGET_PROTECT_RADIUS          = 1000;             // the radius around an object being defended where a target will be worth extra frags
var CTF_ATTACKER_PROTECT_RADIUS        = 1000;             // the radius around an object being defended where an attacker will get extra frags when making kills

var CTF_CARRIER_DANGER_PROTECT_TIMEOUT = 8000;
var CTF_FRAG_CARRIER_ASSIST_TIMEOUT    = 10000;
var CTF_RETURN_FLAG_ASSIST_TIMEOUT     = 10000;

var CTF_GRAPPLE_SPEED                  = 750;              // speed of grapple in flight
var CTF_GRAPPLE_PULL_SPEED             = 750;              // speed player is pulled at

var OVERLOAD_ATTACK_BASE_SOUND_TIME    = 20000;

var teamgame_t = function () {
	this.reset();
};

teamgame_t.prototype.reset = function () {
	this.last_flag_capture       = 0;
	this.last_capture_team       = 0;
	this.redStatus               = 0;  // CTF
	this.blueStatus              = 0;  // CTF
	this.flagStatus              = 0;  // One Flag CTF
	this.redTakenTime            = 0;
	this.blueTakenTime           = 0;
	this.redObeliskAttackedTime  = 0;
	this.blueObeliskAttackedTime = 0;
};

var teamgame = new teamgame_t();

/**
 * OtherTeam
 */
function OtherTeam(team) {
	if (team === TEAM.RED) {
		return TEAM.BLUE;
	} else if (team === TEAM.BLUE) {
		return TEAM.RED;
	}
	return team;
}

/**
 * TeamName
 */
function TeamName(team) {
	if (team === TEAM.RED) {
		return 'RED';
	} else if (team === TEAM.BLUE) {
		return 'BLUE';
	} else if (team === TEAM.SPECTATOR) {
		return 'SPECTATOR';
	}
	return 'FREE';
}

/**
 * Team_InitGame
 */
function Team_InitGame() {
	teamgame.reset();

	switch(g_gametype()) {
	case GT.CTF:
		teamgame.redStatus = -1; // Invalid to force update
		teamgame.blueStatus = -1; // Invalid to force update
		Team_SetFlagStatus(TEAM.RED, FLAG.ATBASE);
		Team_SetFlagStatus(TEAM.BLUE, FLAG.ATBASE);
		break;
	default:
		break;
	}
}

/**
 * Team_SetFlagStatus
 */
var ctfFlagStatusRemap = [0, 1, '*', '*', 2];
var oneFlagStatusRemap = [0, 1, 2, 3, 4];

function Team_SetFlagStatus(team, status) {
	var modified = false;

	switch(team) {
	case TEAM.RED:	// CTF
		if (teamgame.redStatus != status) {
			teamgame.redStatus = status;
			modified = true;
		}
		break;

	case TEAM.BLUE:	// CTF
		if (teamgame.blueStatus != status) {
			teamgame.blueStatus = status;
			modified = true;
		}
		break;

	case TEAM.FREE:	// One Flag CTF
		if (teamgame.flagStatus != status) {
			teamgame.flagStatus = status;
			modified = true;
		}
		break;
	}

	if (modified) {
		var st = new Array(4);

		if(g_gametype() == GT.CTF) {
			st[0] = ctfFlagStatusRemap[teamgame.redStatus];
			st[1] = ctfFlagStatusRemap[teamgame.blueStatus];
			st[2] = 0;
		}
		else {		// GT_1FCTF
			st[0] = oneFlagStatusRemap[teamgame.flagStatus];
			st[1] = 0;
		}

		sv.SetConfigstring('flagstatus', st);
	}
}

/**
 * Team_CheckDroppedItem
 */
function Team_CheckDroppedItem(dropped) {
	if (dropped.item.giTag === PW.REDFLAG) {
		Team_SetFlagStatus(TEAM.RED, FLAG.DROPPED);
	} else if (dropped.item.giTag === PW.BLUEFLAG) {
		Team_SetFlagStatus(TEAM.BLUE, FLAG.DROPPED);
	} else if (dropped.item.giTag == PW.NEUTRALFLAG) {
		Team_SetFlagStatus(TEAM.FREE, FLAG.DROPPED);
	}
}

/**
 * OnSameTeam
 */
function OnSameTeam(ent1, ent2) {
	if (!ent1.client || !ent2.client) {
		return false;
	}

	if (g_gametype() < GT.TEAM) {
		return false;
	}

	if (ent1.client.sess.sessionTeam === ent2.client.sess.sessionTeam) {
		return true;
	}

	return false;
}

/**
 * PickupTeam
 */
function PickupTeam(ent, other) {
	var cl = other.client;

	// Figure out what team this flag is.
	var team;
	if (ent.classname === 'team_CTF_redflag') {
		team = TEAM.RED;
	} else if (ent.classname === 'team_CTF_blueflag') {
		team = TEAM.BLUE;
	} else {
		sv.SendServerCommand(other.s.number, 'print', 'Don\'t know what team the flag is on.');
		return 0;
	}

	// GT.CTF
	if (team === cl.sess.sessionTeam) {
		return Team_TouchOurFlag(ent, other, team);
	}

	return Team_TouchEnemyFlag(ent, other, team);
}

/**
 * Team_TouchOurFlag
 */
function Team_TouchOurFlag(ent, other, team) {
	var cl = other.client;

	var enemy_flag;
	if (cl.sess.sessionTeam == TEAM.RED) {
		enemy_flag = PW.BLUEFLAG;
	} else {
		enemy_flag = PW.REDFLAG;
	}

	if (ent.flags & GFL.DROPPED_ITEM) {
		// Hey, it's not home.  return it by teleporting it back.
		sv.SendServerCommand(null, 'print', cl.pers.netname + ' returned the ' + TeamName(team) + ' flag!');
		AddScore(other, ent.currentOrigin, CTF_RECOVERY_BONUS);
		other.client.pers.teamState.flagrecovery++;
		other.client.pers.teamState.lastreturnedflag = level.time;
		// ResetFlag will remove this entity! We must return zero.
		Team_ReturnFlagSound(Team_ResetFlag(team), team);
		return 0;
	}

	// The flag is at home base. If the player has the enemy
	// flag, he's just won!
	if (!cl.ps.powerups[enemy_flag]) {
		return 0;  // We don't have the flag
	}

	sv.SendServerCommand(null, 'print', cl.pers.netname + ' captured the ' + TeamName(OtherTeam(team)) + ' flag!');

	cl.ps.powerups[enemy_flag] = 0;

	teamgame.last_flag_capture = level.time;
	teamgame.last_capture_team = team;

	// Increase the team's score
	AddTeamScore(ent.s.pos.trBase, other.client.sess.sessionTeam, 1);
	Team_ForceGesture(other.client.sess.sessionTeam);

	other.client.pers.teamState.captures++;
	// Add the sprite over the player's head.
	other.client.ps.eFlags &= ~(EF.AWARD_IMPRESSIVE | EF.AWARD_EXCELLENT | EF.AWARD_GAUNTLET | EF.AWARD_ASSIST | EF.AWARD_DEFEND | EF.AWARD_CAP );
	other.client.ps.eFlags |= EF.AWARD_CAP;
	other.client.rewardTime = level.time + REWARD_SPRITE_TIME;
	other.client.ps.persistant[PERS.CAPTURES]++;

	// Other gets another 10 frag bonus.
	AddScore(other, ent.currentOrigin, CTF_CAPTURE_BONUS);

	Team_CaptureFlagSound(ent, team);

	// Ok, let's do the player loop, hand out the bonuses
	for (var i = 0; i < level.maxclients; i++) {
		var player = level.gentities[i];

		// Also make sure we don't award assist bonuses to the flag carrier himself.
		if (!player.inuse || player == other) {
			continue;
		}

		if (player.client.sess.sessionTeam != cl.sess.sessionTeam) {
			player.client.pers.teamState.lasthurtcarrier = -5;

		} else if (player.client.sess.sessionTeam == cl.sess.sessionTeam) {

			// Award extra points for capture assists.
			if (player.client.pers.teamState.lastreturnedflag + CTF_RETURN_FLAG_ASSIST_TIMEOUT > level.time) {
				AddScore (player, ent.currentOrigin, CTF_RETURN_FLAG_ASSIST_BONUS);
				other.client.pers.teamState.assists++;

				player.client.ps.persistant[PERS.ASSIST_COUNT]++;
				// Add the sprite over the player's head.
				player.client.ps.eFlags &= ~(EF.AWARD_IMPRESSIVE | EF.AWARD_EXCELLENT | EF.AWARD_GAUNTLET | EF.AWARD_ASSIST | EF.AWARD_DEFEND | EF.AWARD_CAP );
				player.client.ps.eFlags |= EF.AWARD_ASSIST;
				player.client.rewardTime = level.time + REWARD_SPRITE_TIME;

			}

			if (player.client.pers.teamState.lastfraggedcarrier + CTF_FRAG_CARRIER_ASSIST_TIMEOUT > level.time) {
				AddScore(player, ent.currentOrigin, CTF_FRAG_CARRIER_ASSIST_BONUS);
				other.client.pers.teamState.assists++;
				player.client.ps.persistant[PERS.ASSIST_COUNT]++;
				// Add the sprite over the player's head.
				player.client.ps.eFlags &= ~(EF.AWARD_IMPRESSIVE | EF.AWARD_EXCELLENT | EF.AWARD_GAUNTLET | EF.AWARD_ASSIST | EF.AWARD_DEFEND | EF.AWARD_CAP );
				player.client.ps.eFlags |= EF.AWARD_ASSIST;
				player.client.rewardTime = level.time + REWARD_SPRITE_TIME;
			}
		}
	}

	Team_ResetFlags();

	CalculateRanks();

	return 0; // Do not respawn this automatically
}

/**
 * Team_TouchEnemyFlag
 */
function Team_TouchEnemyFlag(ent, other, team) {
	var cl = other.client;

	sv.SendServerCommand(null, 'print', other.client.pers.netname + ' got the ' + TeamName(team) + ' flag!');

	if (team == TEAM.RED) {
		cl.ps.powerups[PW.REDFLAG] = 0x1fffffff /*INT_MAX*/; // flags never expire
	} else {
		cl.ps.powerups[PW.BLUEFLAG] = 0x1fffffff /*INT_MAX*/; // flags never expire
	}

	Team_SetFlagStatus(team, FLAG.TAKEN);

	cl.pers.teamState.flagsince = level.time;
	Team_TakeFlagSound(ent, team);

	return -1; // Do not respawn this automatically, but do delete it if it was FL_DROPPED
}

/**
 * AddTeamScore
 *
 * Used for gametype > GT_TEAM.
 * For gametype GT_TEAM the level.teamScores is updated in AddScore in g_combat.c
 */
function AddTeamScore(origin, team, score) {
	var tent = TempEntity(origin, EV.GLOBAL_TEAM_SOUND);
	tent.svFlags |= SVF.BROADCAST;

	if (team === TEAM.RED) {
		if (level.teamScores[TEAM.RED] + score === level.teamScores[TEAM.BLUE]) {
			// Teams are tied sound.
			tent.s.eventParm = GTS.TEAMS_ARE_TIED;
		} else if (level.teamScores[TEAM.RED] <= level.teamScores[TEAM.BLUE] && level.teamScores[TEAM.RED] + score > level.teamScores[TEAM.BLUE]) {
			// Red took the lead sound.
			tent.s.eventParm = GTS.REDTEAM_TOOK_LEAD;
		} else {
			// Red scored sound.
			tent.s.eventParm = GTS.REDTEAM_SCORED;
		}
	} else {
		if (level.teamScores[TEAM.BLUE] + score === level.teamScores[TEAM.RED]) {
			// Teams are tied sound.
			tent.s.eventParm = GTS.TEAMS_ARE_TIED;
		} else if (level.teamScores[TEAM.BLUE] <= level.teamScores[TEAM.RED] && level.teamScores[TEAM.BLUE] + score > level.teamScores[TEAM.RED]) {
			// Blue took the lead sound.
			tent.s.eventParm = GTS.BLUETEAM_TOOK_LEAD;

		} else {
			// Blue scored sound.
			tent.s.eventParm = GTS.BLUETEAM_SCORED;
		}
	}

	level.teamScores[team] += score;
}

/**
 * Team_ForceGesture
 */
function Team_ForceGesture(team) {
	var i;
	var ent;

	for (i = 0; i < MAX_CLIENTS; i++) {
		ent = level.gentities[i];
		if (!ent.inuse)
			continue;
		if (!ent.client)
			continue;
		if (ent.client.sess.sessionTeam != team)
			continue;
		//
		ent.flags |= GFL.FORCE_GESTURE;
	}
}

/**
 * Team_ResetFlags
 */
function Team_ResetFlags() {
	if (g_gametype() == GT.CTF) {
		Team_ResetFlag(TEAM.RED);
		Team_ResetFlag(TEAM.BLUE);

	} else if (g_gametype() == GT.NFCTF) {
		Team_ResetFlag(TEAM.FREE);
	}
}

/**
 * Team_ResetFlag
 */
function Team_ResetFlag(team) {
	var str;
	var ents;
	var rent;

	switch (team) {
	case TEAM.RED:
		str = "team_CTF_redflag";
		break;
	case TEAM.BLUE:
		str = "team_CTF_blueflag";
		break;
	case TEAM.FREE:
		str = "team_CTF_neutralflag";
		break;
	default:
		return null;
	}

	ents = FindEntity({ classname: str });

	for (var i = 0; i < ents.length; i++) {

		if (ents[i].flags & GFL.DROPPED_ITEM) {
			FreeEntity(ents[i]);

		} else {
			rent = ents[i];
			RespawnItem(ents[i]);
		}
	}

	Team_SetFlagStatus(team, FLAG.ATBASE);

	return rent;
}

/**
 * PickTeam
 */
function PickTeam(arena, ignoreClientNum) {
	var counts = new Array(TEAM.NUM_TEAMS);

	// Always TEAM.FREE in lobby of CA.
	if (g_gametype() === GT.CLANARENA && arena === 0) {
		return TEAM.FREE;
	}

	counts[TEAM.BLUE] = TeamCount(TEAM.BLUE, ignoreClientNum);
	counts[TEAM.RED] = TeamCount(TEAM.RED, ignoreClientNum);

	if (counts[TEAM.BLUE] > counts[TEAM.RED]) {
		return TEAM.RED;
	}

	if (counts[TEAM.RED] > counts[TEAM.BLUE]) {
		return TEAM.BLUE;
	}

	// Equal team count, so join the team with the lowest score.
	if (level.teamScores[TEAM.BLUE] > level.teamScores[TEAM.RED]) {
		return TEAM.RED;
	}

	return TEAM.BLUE;
}

/**
 * TeamCount
 *
 * Returns number of players on a team
 */
function TeamCount(team, ignoreClientNum) {
	var count = 0;

	for (var i = 0; i < level.maxclients; i++) {
		if (i === ignoreClientNum) {
			continue;
		}

		var client = level.clients[i];

		if (client.pers.connected === CON.DISCONNECTED) {
			continue;
		}

		if (client.sess.sessionTeam === team) {
			count++;
		}
	}

	return count;
}

/**
 * TeamAliveCount
 */
function TeamAliveCount(ignoreClientNum, team) {
	var count = 0;

	for (var i = 0; i < level.maxclients; i++) {
		if (i === ignoreClientNum) {
			continue;
		}

		var client = level.clients[i];

		if (client.pers.connected === CON.DISCONNECTED ||
			client.sess.spectatorState !== SPECTATOR.NOT) {
			continue;
		}

		if (client.sess.sessionTeam === team) {
			count++;
		}
	}

	return count;
}

/**
 * TeamLeader
 *
 * Returns the client number of the team leader
 */
function TeamLeader(team) {
	for (var i = 0; i < level.maxclients; i++ ) {
		if (level.clients[i].pers.connected === CON.DISCONNECTED) {
			continue;
		}

		if (level.clients[i].sess.sessionTeam === team) {
			if (level.clients[i].sess.teamLeader) {
				return i;
			}
		}
	}

	return -1;
}

/**
 * CheckTeamLeader
 *
 * Force a team leader if there isn't one.
 */
function CheckTeamLeader(team) {
	var i;

	for (i = 0; i < level.maxclients; i++) {
		var client = level.clients[i];

		if (client.sess.sessionTeam !== team) {
			continue;
		}

		if (client.sess.teamLeader) {
			break;
		}
	}

	if (i >= level.maxclients) {
		for (i = 0; i < level.maxclients; i++) {
			var client = level.clients[i];

			if (client.sess.sessionTeam !== team) {
				continue;
			}

			// if (!(g_entities[i].r.svFlags & SVF_BOT)) {
				level.clients[i].sess.teamLeader = true;
				break;
			// }
		}

		// if (i >= level.maxclients) {
		// 	for (i = 0; i < level.maxclients; i++) {
		// 		var client = level.clients[i];

		// 		if (client.sess.sessionTeam !== team) {
		// 			continue;
		// 		}

		// 		client.sess.teamLeader = true;
		// 		break;
		// 	}
		// }
	}
}

/**
 * SetLeader
 */
function SetTeamLeader(clientNum, team) {
	var client = level.clients[clientNum];

	if (client.pers.connected === CON.DISCONNECTED) {
		// PrintTeam(team, va("print \"%s is not connected\n\"", level.clients[client].pers.netname) );
		return;
	}

	if (client.sess.sessionTeam !== team) {
		// PrintTeam(team, va("print \"%s is not on the team anymore\n\"", level.clients[client].pers.netname) );
		return;
	}

	// Remove old team leader.
	for (var i = 0; i < level.maxclients; i++) {
		if (level.clients[i].sess.sessionTeam !== team) {
			continue;
		}

		if (level.clients[i].sess.teamLeader) {
			level.clients[i].sess.teamLeader = false;
			ClientUserinfoChanged(i);
		}
	}

	client.sess.teamLeader = true;
	ClientUserinfoChanged(clientNum);
	// PrintTeam(team, va("print \"%s is the new team leader\n\"", level.clients[client].pers.netname) );
}

/**
 * BroadCastTeamChange
 *
 * Let everyone know about a team change.
 */
function BroadcastTeamChange(oldTeam, client) {
	if (client.sess.sessionTeam === TEAM.RED) {
		sv.SendServerCommand(null, 'cp', client.pers.netname + ' joined the red team.');
	} else if (client.sess.sessionTeam === TEAM.BLUE) {
		sv.SendServerCommand(null, 'cp', client.pers.netname + ' joined the blue team.');
	} else if (client.sess.sessionTeam === TEAM.SPECTATOR && oldTeam !== TEAM.SPECTATOR) {
		sv.SendServerCommand(null, 'cp', client.pers.netname + ' joined the spectators.');
	} else if (client.sess.sessionTeam === TEAM.FREE) {
		sv.SendServerCommand(null, 'cp', client.pers.netname + ' joined the battle.');
	}
}

/**
 * Team_ReturnFlagSound
 */
function Team_ReturnFlagSound(ent, team) {
	if (!ent) {
// 		G_Printf ("Warning:  NULL passed to Team_ReturnFlagSound\n");
		return;
	}

	var temp = TempEntity(ent.s.pos.trBase, EV.GLOBAL_TEAM_SOUND);
	if (team == TEAM.BLUE ) {
		temp.s.eventParm = GTS.RED_RETURN;
	} else {
		temp.s.eventParm = GTS.BLUE_RETURN;
	}
	temp.svFlags |= SVF.BROADCAST;
}

/**
 * Team_TakeFlagSound
 */
function Team_TakeFlagSound(ent, team) {
	if (!ent) {
// 		G_Printf ("Warning:  NULL passed to Team_TakeFlagSound\n");
		return;
	}

	// only play sound when the flag was at the base
	// or not picked up the last 10 seconds
	switch(team) {
		case TEAM.RED:
			if (teamgame.blueStatus != FLAG.ATBASE ) {
				if (teamgame.blueTakenTime > level.time - 10000) {
					return;
				}
			}
			teamgame.blueTakenTime = level.time;
			break;

		case TEAM.BLUE:	// CTF
			if (teamgame.redStatus != FLAG.ATBASE ) {
				if (teamgame.redTakenTime > level.time - 10000) {
					return;
				}
			}
			teamgame.redTakenTime = level.time;
			break;
	}

	var temp = TempEntity(ent.s.pos.trBase, EV.GLOBAL_TEAM_SOUND);
	if (team == TEAM.BLUE) {
		temp.s.eventParm = GTS.RED_TAKEN;
	} else {
		temp.s.eventParm = GTS.BLUE_TAKEN;
	}

	temp.svFlags |= SVF.BROADCAST;
}

/**
 * Team_CaptureFlagSound
 */
function Team_CaptureFlagSound(ent, team) {
	if (!ent) {
// 		G_Printf ("Warning:  NULL passed to Team_CaptureFlagSound\n");
		return;
	}

	var temp = TempEntity(ent.s.pos.trBase, EV.GLOBAL_TEAM_SOUND);
	if (team === TEAM.BLUE) {
		temp.s.eventParm = GTS.BLUE_CAPTURE;
	} else {
		temp.s.eventParm = GTS.RED_CAPTURE;
	}
	temp.svFlags |= SVF.BROADCAST;
}

/**
 * Team_ReturnFlag
 */
function Team_ReturnFlag(team) {
	Team_ReturnFlagSound(Team_ResetFlag(team), team);
	if (team === TEAM.FREE) {
		sv.SendServerCommand(null, 'print', 'The flag has returned!');
	} else {
		sv.SendServerCommand(null, 'print', 'The ' + TeamName(team) + ' flag has returned!');
	}
}

/**
 * Team_FreeEntity
 */
function Team_FreeEntity(ent) {
	if (ent.item.giTag === PW.REDFLAG) {
		Team_ReturnFlag(TEAM.RED);
	} else if (ent.item.giTag === PW.BLUEFLAG) {
		Team_ReturnFlag(TEAM.BLUE);
	} else if (ent.item.giTag === PW.NEUTRALFLAG) {
		Team_ReturnFlag(TEAM.FREE);
	}
}

/**
 * Team_DroppedFlagThink
 *
 * Automatically set in Launch_Item if the item is one of the flags.
 *
 * Flags are unique in that if they are dropped, the base flag must be respawned when they time out.
 */
function Team_DroppedFlagThink(ent) {
	var team = TEAM.FREE;

	if (ent.item.giTag === PW.REDFLAG) {
		team = TEAM.RED;
	} else if (ent.item.giTag === PW.BLUEFLAG) {
		team = TEAM.BLUE;
	} else if (ent.item.giTag === PW.NEUTRALFLAG) {
		team = TEAM.FREE;
	}

	Team_ReturnFlagSound(Team_ResetFlag(team), team);
	// Reset Flag will delete this entity.
}

/**
 * SelectCTFSpawnPoint
 */
function SelectCTFSpawnPoint(team, teamstate, origin, angles, arena) {
	var classname;
	if (teamstate == TEAM_STATE.BEGIN) {
		if (team == TEAM.RED) {
			classname = 'team_CTF_redplayer';
		} else if (team == TEAM.BLUE) {
			classname = 'team_CTF_blueplayer';
		}
	} else {
		if (team == TEAM.RED) {
			classname = 'team_CTF_redspawn';
		} else if (team == TEAM.BLUE) {
			classname = 'team_CTF_bluespawn';
		}
	}
	if (!classname) {
		return SelectSpawnPoint(QMath.vec3origin, origin, angles, arena);
	}

	var spawnpoints = FindEntity({ classname: classname });
	var spots = [];
	var spot;

	for (var i = 0; i < spawnpoints.length; i++) {
		spot = spawnpoints[i];

		if (SpotWouldTelefrag(spot)) {
			continue;
		}

		// In GT.CLANARENA, only select spawn points from the current arena.
		if (g_gametype() === GT.CLANARENA && spot.arena !== arena) {
			continue;
		}

		spots.push(spot);
	}

	if (!spots.length) {
		spot = spawnpoints[0];
		if (!spot) {
			return SelectSpawnPoint(QMath.vec3origin, origin, angles, arena);
		}
	} else {
		var selection = QMath.irrandom(0, spots.length - 1);
		spot = spots[selection];
	}

	vec3.set(spot.s.origin, origin);
	origin[2] += 9;
	vec3.set(spot.s.angles, angles);

	return spot;
}