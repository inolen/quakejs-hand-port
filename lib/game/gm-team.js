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

var TeamGame = function () {
	this.reset();
};

TeamGame.prototype.reset = function () {
	this.last_flag_capture = 0;
	this.last_capture_team = 0;
	this.redStatus         = 0;  // CTF
	this.blueStatus        = 0;  // CTF
	this.neutralStatus     = 0;  // One Flag CTF
	this.redTakenTime      = 0;
	this.blueTakenTime     = 0;
};

var teamgame = new TeamGame();

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
 * OnSameTeam
 */
function OnSameTeam(ent1, ent2) {
	if (!ent1.client || !ent2.client) {
		return false;
	}

	if (level.arena.gametype < GT.TEAM) {
		return false;
	}

	if (ent1.client.sess.team === ent2.client.sess.team) {
		return true;
	}

	return false;
}

/**
 * PickTeam
 */
function PickTeam(ignoreClientNum) {
	var team = TEAM.FREE;

	if (level.arena.gametype >= GT.TEAM) {
		// Find the team with the least amount of players.
		var counts = new Array(TEAM.NUM_TEAMS);

		counts[TEAM.RED] = TeamCount(TEAM.RED, ignoreClientNum);
		counts[TEAM.BLUE] = TeamCount(TEAM.BLUE, ignoreClientNum);

		if (counts[TEAM.RED] > counts[TEAM.BLUE]) {
			team = TEAM.BLUE;
		} else if (counts[TEAM.BLUE] > counts[TEAM.RED]) {
			team = TEAM.RED;
		}
		// Equal team count, so join the team with the lowest score.
		else if (level.arena.teamScores[TEAM.RED] > level.arena.teamScores[TEAM.BLUE]) {
			team = TEAM.BLUE;
		} else {
			team = TEAM.RED;
		}
	}

	// If we've exceeded the amount of allowed players, kick to spec.
	if ((level.arena.gametype === GT.TOURNAMENT && level.arena.numNonSpectatorClients >= 2)) {
		team = TEAM.SPECTATOR;
	}

	return team;
}

/**
 * TeamCount
 *
 * Returns number of players on a team.
 */
function TeamCount(team, ignoreClientNum) {
	var count = 0;

	for (var i = 0; i < level.maxclients; i++) {
		if (i === ignoreClientNum) {
			continue;
		}

		var ent = level.gentities[i];

		if (!ent.inuse) {
			continue;
		}

		if (ent.s.arenaNum !== level.arena.arenaNum) {
			continue;
		}

		if (ent.client.sess.team === team) {
			count++;
		}
	}

	return count;
}

/**
 * TeamAliveCount
 */
function TeamAliveCount(team) {
	var count = 0;

	for (var i = 0; i < level.maxclients; i++) {
		var ent = level.gentities[i];

		if (!ent.inuse) {
			continue;
		}

		if (ent.s.arenaNum !== level.arena.arenaNum) {
			continue;
		}

		if (ent.client.sess.team !== team) {
			continue;
		}

		if (ent.client.pers.teamState.state !== TEAM_STATE.ELIMINATED) {
			count++;
		}
	}

	return count;
}

/**
 * TeamGroupCount
 */
function TeamGroupCount(group, ignoreClientNum) {
	var count = 0;

	for (var i = 0; i < level.maxclients; i++) {
		if (i === ignoreClientNum) {
			continue;
		}

		var ent = level.gentities[i];

		if (!ent.inuse) {
			continue;
		}

		if (ent.s.arenaNum !== level.arena.arenaNum) {
			continue;
		}

		if (ent.client.sess.group === group) {
			count++;
		}
	}

	return count;
}

/**
 * TeamGroupScore
 */
function TeamGroupScore(group) {
	var score = 0;

	for (var i = 0; i < level.maxclients; i++) {
		var ent = level.gentities[i];

		if (!ent.inuse) {
			continue;
		}

		if (ent.s.arenaNum !== level.arena.arenaNum) {
			continue;
		}

		if (ent.client.sess.group !== group) {
			continue;
		}

		score += ent.client.ps.persistant[PERS.SCORE];
	}

	return score;
}

/**
 * Team_CheckItems
 */
function Team_CheckItems() {
	// Set up team stuff
	Team_InitGame();

	if (level.arena.gametype === GT.CTF) {
		// Check for the two flags.
		var item = BG.FindItemForPowerup(PW.REDFLAG);
		if (!item) {
			error('No team_CTF_redflag in map');
		}

		item = BG.FindItemForPowerup(PW.BLUEFLAG);
		if (!item) {
			error('No team_CTF_blueflag in map');
		}
	}
}

/**
 * Team_InitGame
 */
function Team_InitGame() {
	teamgame.reset();

	switch (level.arena.gametype) {
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
		if (teamgame.neutralStatus != status) {
			teamgame.neutralStatus = status;
			modified = true;
		}
		break;
	}

	if (modified) {
		var st = new Array(2);

		if (level.arena.gametype === GT.CTF) {
			st[0] = ctfFlagStatusRemap[teamgame.redStatus];
			st[1] = ctfFlagStatusRemap[teamgame.blueStatus];
		} else {  // GT.NFCTF
			st[0] = oneFlagStatusRemap[teamgame.neutralStatus];
		}

		SetArenaConfigstring('flagstatus', st);
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
 * Team_PickupItem
 */
function Team_PickupItem(ent, other) {
	var cl = other.client;

	// Figure out what team this flag is.
	var team;
	if (ent.classname === 'team_CTF_redflag') {
		team = TEAM.RED;
	} else if (ent.classname === 'team_CTF_blueflag') {
		team = TEAM.BLUE;
	} else {
		SV.SendServerCommand(other.s.number, 'print', 'Don\'t know what team the flag is on.');
		return 0;
	}

	// GT.CTF
	if (team === cl.sess.team) {
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
	if (cl.sess.team == TEAM.RED) {
		enemy_flag = PW.BLUEFLAG;
	} else {
		enemy_flag = PW.REDFLAG;
	}

	if (ent.flags & GFL.DROPPED_ITEM) {
		// Hey, it's not home.  return it by teleporting it back.
		SV.SendServerCommand(null, 'print', cl.pers.name + ' returned the ' + TeamName(team) + ' flag!');
		AddScore(other, ent.r.currentOrigin, CTF_RECOVERY_BONUS);
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

	SV.SendServerCommand(null, 'print', cl.pers.name + ' captured the ' + TeamName(OtherTeam(team)) + ' flag!');

	cl.ps.powerups[enemy_flag] = 0;

	teamgame.last_flag_capture = level.time;
	teamgame.last_capture_team = team;

	// Increase the team's score
	Team_AddScore(other.client.sess.team, ent.s.pos.trBase, 1);
	Team_ForceGesture(other.client.sess.team);

	other.client.pers.teamState.captures++;
	// Add the sprite over the player's head.
	other.client.ps.eFlags &= ~(EF.AWARD_IMPRESSIVE | EF.AWARD_EXCELLENT | EF.AWARD_GAUNTLET | EF.AWARD_ASSIST | EF.AWARD_DEFEND | EF.AWARD_CAP );
	other.client.ps.eFlags |= EF.AWARD_CAP;
	other.client.rewardTime = level.time + REWARD_SPRITE_TIME;
	other.client.ps.persistant[PERS.CAPTURES]++;

	// Other gets another 10 frag bonus.
	AddScore(other, ent.r.currentOrigin, CTF_CAPTURE_BONUS);

	Team_CaptureFlagSound(ent, team);

	// Ok, let's do the player loop, hand out the bonuses
	for (var i = 0; i < level.maxclients; i++) {
		var player = level.gentities[i];

		// Also make sure we don't award assist bonuses to the flag carrier himself.
		if (!player.inuse || player == other) {
			continue;
		}

		if (player.client.sess.team != cl.sess.team) {
			player.client.pers.teamState.lasthurtcarrier = -5;

		} else if (player.client.sess.team == cl.sess.team) {

			// Award extra points for capture assists.
			if (player.client.pers.teamState.lastreturnedflag + CTF_RETURN_FLAG_ASSIST_TIMEOUT > level.time) {
				AddScore (player, ent.r.currentOrigin, CTF_RETURN_FLAG_ASSIST_BONUS);
				other.client.pers.teamState.assists++;

				player.client.ps.persistant[PERS.ASSIST_COUNT]++;
				// Add the sprite over the player's head.
				player.client.ps.eFlags &= ~(EF.AWARD_IMPRESSIVE | EF.AWARD_EXCELLENT | EF.AWARD_GAUNTLET | EF.AWARD_ASSIST | EF.AWARD_DEFEND | EF.AWARD_CAP );
				player.client.ps.eFlags |= EF.AWARD_ASSIST;
				player.client.rewardTime = level.time + REWARD_SPRITE_TIME;

			}

			if (player.client.pers.teamState.lastfraggedcarrier + CTF_FRAG_CARRIER_ASSIST_TIMEOUT > level.time) {
				AddScore(player, ent.r.currentOrigin, CTF_FRAG_CARRIER_ASSIST_BONUS);
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

	if (level.arena.gametype === GT.NFCTF) {
		SV.SendServerCommand(null, 'print', other.client.pers.name + QS.EscapeColor(QS.COLOR.WHITE) + ' got the flag!');

		cl.ps.powerups[PW.NEUTRALFLAG] = 0x1fffffff; // flags never expire

		if (team === TEAM.RED) {
			Team_SetFlagStatus(TEAM.FREE, FLAG.TAKEN_RED);
		} else {
			Team_SetFlagStatus(TEAM.FREE, FLAG.TAKEN_BLUE);
		}
	} else {
		SV.SendServerCommand(null, 'print', other.client.pers.name + QS.EscapeColor(QS.COLOR.WHITE) + ' got the ' + TeamName(team) + ' flag!');

		if (team === TEAM.RED) {
			cl.ps.powerups[PW.REDFLAG] = 0x1fffffff /*INT_MAX*/; // flags never expire
		} else {
			cl.ps.powerups[PW.BLUEFLAG] = 0x1fffffff /*INT_MAX*/; // flags never expire
		}

		Team_SetFlagStatus(team, FLAG.TAKEN);
	}

	AddScore(other, ent.r.currentOrigin, CTF_FLAG_BONUS);

	cl.pers.teamState.flagsince = level.time;
	Team_TakeFlagSound(ent, team);

	return -1; // Do not respawn this automatically, but do delete it if it was FL_DROPPED
}

/**
 * Team_ForceGesture
 */
function Team_ForceGesture(team) {
	for (var i = 0; i < MAX_CLIENTS; i++) {
		var ent = level.gentities[i];
		if (!ent.inuse) {
			continue;
		}
		if (!ent.client) {
			continue;
		}
		if (ent.client.sess.team != team) {
			continue;
		}

		ent.flags |= GFL.FORCE_GESTURE;
	}
}


/**
 * Team_FragBonuses
 *
 * Calculate the bonuses for flag defense, flag carrier defense, etc.
 * Note that bonuses are not cumulative. You get one, they are in importance
 * order.
 */
function Team_FragBonuses(targ, inflictor, attacker) {
	// No bonus for fragging yourself or team mates.
	if (!targ.client || !attacker.client || targ === attacker || OnSameTeam(targ, attacker)) {
		return;
	}

	var team = targ.client.sess.team;
	var otherteam = OtherTeam(targ.client.sess.team);
	if (otherteam < 0) {
		return;  // whoever died isn't on a team
	}

	// Same team, if the flag at base, check to he has the enemy flag.
	var flag_pw;
	var enemy_flag_pw;

	if (team === TEAM.RED) {
		flag_pw = PW.REDFLAG;
		enemy_flag_pw = PW.BLUEFLAG;
	} else {
		flag_pw = PW.BLUEFLAG;
		enemy_flag_pw = PW.REDFLAG;
	}

	if (level.arena.gametype === GT.NFCTF) {
		enemy_flag_pw = PW.NEUTRALFLAG;
	}

	// Did the attacker frag the flag carrier?
	var tokens = 0;

	if (targ.client.ps.powerups[enemy_flag_pw]) {
		attacker.client.pers.teamState.lastfraggedcarrier = level.time;
		AddScore(attacker, targ.r.currentOrigin, CTF_FRAG_CARRIER_BONUS);
		attacker.client.pers.teamState.fragcarrier++;

		SV.SendServerCommand(null, 'print', attacker.client.pers.name + QS.EscapeColor(QS.COLOR.WHITE) + ' fragged ' + TeamName(team) + '\'s flag carrier!');

		// The target had the flag, clear the hurt carrier
		// field on the other team.
		for (var i = 0; i < level.maxclients.integer; i++) {
			var ent = level.gentities[i];

			if (ent.inuse && ent.client.sess.team === otherteam) {
				ent.client.pers.teamState.lasthurtcarrier = 0;
			}
		}

		return;
	}

	if (targ.client.pers.teamState.lasthurtcarrier &&
		level.time - targ.client.pers.teamState.lasthurtcarrier < CTF_CARRIER_DANGER_PROTECT_TIMEOUT &&
		!attacker.client.ps.powerups[flag_pw]) {
		// Attacker is on the same team as the flag carrier and
		// fragged a guy who hurt our flag carrier.
		AddScore(attacker, targ.r.currentOrigin, CTF_CARRIER_DANGER_PROTECT_BONUS);

		attacker.client.pers.teamState.carrierdefense++;
		targ.client.pers.teamState.lasthurtcarrier = 0;

		attacker.client.ps.persistant[PERS.DEFEND_COUNT]++;
		// Add the sprite over the player's head.
		attacker.client.ps.eFlags &= ~(EF.AWARD_IMPRESSIVE | EF.AWARD_EXCELLENT | EF.AWARD_GAUNTLET | EF.AWARD_ASSIST | EF.AWARD_DEFEND | EF.AWARD_CAP );
		attacker.client.ps.eFlags |= EF.AWARD_DEFEND;
		attacker.client.rewardTime = level.time + REWARD_SPRITE_TIME;

		return;
	}

	if (targ.client.pers.teamState.lasthurtcarrier &&
		level.time - targ.client.pers.teamState.lasthurtcarrier < CTF_CARRIER_DANGER_PROTECT_TIMEOUT) {
		// Attacker is on the same team as the skull carrier and.
		AddScore(attacker, targ.r.currentOrigin, CTF_CARRIER_DANGER_PROTECT_BONUS);

		attacker.client.pers.teamState.carrierdefense++;
		targ.client.pers.teamState.lasthurtcarrier = 0;

		attacker.client.ps.persistant[PERS.DEFEND_COUNT]++;
		// Add the sprite over the player's head.
		attacker.client.ps.eFlags &= ~(EF.AWARD_IMPRESSIVE | EF.AWARD_EXCELLENT | EF.AWARD_GAUNTLET | EF.AWARD_ASSIST | EF.AWARD_DEFEND | EF.AWARD_CAP );
		attacker.client.ps.eFlags |= EF.AWARD_DEFEND;
		attacker.client.rewardTime = level.time + REWARD_SPRITE_TIME;

		return;
	}

	// Flag and flag carrier area defense bonuses.

	// We have to find the flag and carrier entities.

	// Find the flag
	var c;
	switch (attacker.client.sess.team) {
		case TEAM.RED:
			c = "team_CTF_redflag";
			break;
		case TEAM.BLUE:
			c = "team_CTF_blueflag";
			break;
		default:
			return;
	}

	// Find attacker's team's flag carrier.
	var carrier;
	var flag;

	for (var i = 0; i < level.maxclients; i++) {
		carrier = level.gentities[i];

		if (carrier.inuse && carrier.client.ps.powerups[flag_pw]) {
			break;
		}

		carrier = null;
	}

	var flags = FindEntity({ classname: c });
	for (var i = 0; i < flags.length; i++) {
		flag = flags[i];

		if (!(flag.flags & GFL.DROPPED_ITEM)) {
			break;
		}
	}

	if (!flag) {
		return;  // can't find attacker's flag
	}

	// Ok we have the attackers flag and a pointer to the carrier.

	// Check to see if we are defending the base's flag.
	var v1 = vec3.subtract(targ.r.currentOrigin, flag.r.currentOrigin, vec3.create());
	var v2 = vec3.subtract(attacker.r.currentOrigin, flag.r.currentOrigin, vec3.create());

	if (((vec3.length(v1) < CTF_TARGET_PROTECT_RADIUS /*&&
		trap_InPVS(flag.r.currentOrigin, targ.r.currentOrigin)*/) ||
		(vec3.length(v2) < CTF_TARGET_PROTECT_RADIUS /*&&
		trap_InPVS(flag.r.currentOrigin, attacker.r.currentOrigin)*/)) &&
		attacker.client.sess.team !== targ.client.sess.team) {
		// We defended the base flag.
		AddScore(attacker, targ.r.currentOrigin, CTF_FLAG_DEFENSE_BONUS);
		attacker.client.pers.teamState.basedefense++;

		attacker.client.ps.persistant[PERS.DEFEND_COUNT]++;
		// Add the sprite over the player's head.
		attacker.client.ps.eFlags &= ~(EF.AWARD_IMPRESSIVE | EF.AWARD_EXCELLENT | EF.AWARD_GAUNTLET | EF.AWARD_ASSIST | EF.AWARD_DEFEND | EF.AWARD_CAP );
		attacker.client.ps.eFlags |= EF.AWARD_DEFEND;
		attacker.client.rewardTime = level.time + REWARD_SPRITE_TIME;

		return;
	}

	if (carrier && carrier !== attacker) {
		vec3.subtract(targ.r.currentOrigin, carrier.r.currentOrigin, v1);
		vec3.subtract(attacker.r.currentOrigin, carrier.r.currentOrigin, v2);

		if (((vec3.length(v1) < CTF_ATTACKER_PROTECT_RADIUS /*&&
			trap_InPVS(carrier.r.currentOrigin, targ.r.currentOrigin)*/) ||
			(vec3.length(v2) < CTF_ATTACKER_PROTECT_RADIUS /*&&
			trap_InPVS(carrier.r.currentOrigin, attacker.r.currentOrigin)*/)) &&
			attacker.client.sess.team !== targ.client.sess.team) {
			AddScore(attacker, targ.r.currentOrigin, CTF_CARRIER_PROTECT_BONUS);
			attacker.client.pers.teamState.carrierdefense++;

			attacker.client.ps.persistant[PERS.DEFEND_COUNT]++;
			// add the sprite over the player's head
			attacker.client.ps.eFlags &= ~(EF.AWARD_IMPRESSIVE | EF.AWARD_EXCELLENT | EF.AWARD_GAUNTLET | EF.AWARD_ASSIST | EF.AWARD_DEFEND | EF.AWARD_CAP );
			attacker.client.ps.eFlags |= EF.AWARD_DEFEND;
			attacker.client.rewardTime = level.time + REWARD_SPRITE_TIME;

			return;
		}
	}
}

/**
 * Team_CheckHurtCarrier
 *
 * Check to see if attacker hurt the flag carrier.  Needed when handing out bonuses for assistance to flag
 * carrier defense.
 */
function Team_CheckHurtCarrier(targ, attacker) {
	if (!targ.client || !attacker.client) {
		return;
	}

	var flag_pw;

	if (targ.client.sess.team === TEAM.RED) {
		flag_pw = PW.BLUEFLAG;
	} else {
		flag_pw = PW.REDFLAG;
	}

	// flags
	if (targ.client.ps.powerups[flag_pw] &&
		targ.client.sess.team != attacker.client.sess.team) {
		attacker.client.pers.teamState.lasthurtcarrier = level.time;
	}

	// // skulls
	// if (targ.client.ps.generic1 &&
	// 	targ.client.sess.team != attacker.client.sess.team) {
	// 	attacker.client.pers.teamState.lasthurtcarrier = level.time;
	// }
}

/**
 * Team_ResetFlags
 */
function Team_ResetFlags() {
	if (level.arena.gametype == GT.CTF) {
		Team_ResetFlag(TEAM.RED);
		Team_ResetFlag(TEAM.BLUE);

	} else if (level.arena.gametype == GT.NFCTF) {
		Team_ResetFlag(TEAM.FREE);
	}
}

/**
 * Team_ResetFlag
 */
function Team_ResetFlag(team) {
	var str;
	switch (team) {
		case TEAM.RED:
			str = 'team_CTF_redflag';
			break;
		case TEAM.BLUE:
			str = 'team_CTF_blueflag';
			break;
		case TEAM.FREE:
			str = 'team_CTF_neutralflag';
			break;
		default:
			return null;
	}

	var ents = FindEntity({ classname: str });
	var rent;

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
 * Team_ReturnFlagSound
 */
function Team_ReturnFlagSound(ent, team) {
	if (!ent) {
		log('Warning: NULL passed to Team_ReturnFlagSound');
		return;
	}

	var temp = TempEntity(ent.s.pos.trBase, EV.GLOBAL_TEAM_SOUND);
	if (team == TEAM.BLUE ) {
		temp.s.eventParm = GTS.RED_RETURN;
	} else {
		temp.s.eventParm = GTS.BLUE_RETURN;
	}
	temp.r.svFlags |= SVF.BROADCAST;
}

/**
 * Team_TakeFlagSound
 */
function Team_TakeFlagSound(ent, team) {
	if (!ent) {
		log('Warning: NULL passed to Team_TakeFlagSound');
		return;
	}

	// Only play sound when the flag was at the base
	// or not picked up the last 10 seconds.
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

	temp.r.svFlags |= SVF.BROADCAST;
}

/**
 * Team_CaptureFlagSound
 */
function Team_CaptureFlagSound(ent, team) {
	if (!ent) {
		log('Warning: NULL passed to Team_CaptureFlagSound');
		return;
	}

	var temp = TempEntity(ent.s.pos.trBase, EV.GLOBAL_TEAM_SOUND);
	if (team === TEAM.BLUE) {
		temp.s.eventParm = GTS.BLUE_CAPTURE;
	} else {
		temp.s.eventParm = GTS.RED_CAPTURE;
	}
	temp.r.svFlags |= SVF.BROADCAST;
}

/**
 * Team_ReturnFlag
 */
function Team_ReturnFlag(team) {
	Team_ReturnFlagSound(Team_ResetFlag(team), team);
	if (team === TEAM.FREE) {
		SV.SendServerCommand(null, 'print', 'The flag has returned!');
	} else {
		SV.SendServerCommand(null, 'print', 'The ' + TeamName(team) + ' flag has returned!');
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
 * Team_AddScore
 *
 * Used for gametype > GT.TEAM.
 * For gametype GT.TEAM the teamScores is updated in AddScore in g_combat.c
 */
function Team_AddScore(team, origin, score) {
	var tent = TempEntity(origin, EV.GLOBAL_TEAM_SOUND);
	tent.r.svFlags |= SVF.BROADCAST;

	if (team === TEAM.RED) {
		if (level.arena.teamScores[TEAM.RED] + score === level.arena.teamScores[TEAM.BLUE]) {
			// Teams are tied sound.
			tent.s.eventParm = GTS.TEAMS_ARE_TIED;
		} else if (level.arena.teamScores[TEAM.RED] <= level.arena.teamScores[TEAM.BLUE] && level.arena.teamScores[TEAM.RED] + score > level.arena.teamScores[TEAM.BLUE]) {
			// Red took the lead sound.
			tent.s.eventParm = GTS.REDTEAM_TOOK_LEAD;
		} else {
			// Red scored sound.
			tent.s.eventParm = GTS.REDTEAM_SCORED;
		}
	} else {
		if (level.arena.teamScores[TEAM.BLUE] + score === level.arena.teamScores[TEAM.RED]) {
			// Teams are tied sound.
			tent.s.eventParm = GTS.TEAMS_ARE_TIED;
		} else if (level.arena.teamScores[TEAM.BLUE] <= level.arena.teamScores[TEAM.RED] && level.arena.teamScores[TEAM.BLUE] + score > level.arena.teamScores[TEAM.RED]) {
			// Blue took the lead sound.
			tent.s.eventParm = GTS.BLUETEAM_TOOK_LEAD;

		} else {
			// Blue scored sound.
			tent.s.eventParm = GTS.BLUETEAM_SCORED;
		}
	}

	level.arena.teamScores[team] += score;
}

/**
 * SelectCTFSpawnPoint
 */
function SelectCTFSpawnPoint(team, teamstate, origin, angles) {
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
		return SelectSpawnPoint(QMath.vec3origin, origin, angles);
	}

	var spawnpoints = FindEntity({ classname: classname });
	var spots = [];
	var spot;

	for (var i = 0; i < spawnpoints.length; i++) {
		spot = spawnpoints[i];

		if (SpotWouldTelefrag(spot)) {
			continue;
		}

		if (spot.arena !== ARENANUM_NONE && spot.arena !== level.arena.arenaNum) {
			continue;
		}

		spots.push(spot);
	}

	if (!spots.length) {
		spot = spawnpoints[0];
		if (!spot) {
			return SelectSpawnPoint(QMath.vec3origin, origin, angles);
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