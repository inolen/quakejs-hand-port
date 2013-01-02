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
	if (msec < 1 /*&& client.sess.spectatorState != SPECTATOR_FOLLOW*/) {
		return;
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
		if (level.warmupTime !== 0) {
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
	if (pm.ps.pm_type === PM.DEAD) {
		pm.tracemask = MASK.PLAYERSOLID & ~CONTENTS.BODY;
	} else {
		pm.tracemask = MASK.PLAYERSOLID;
	}

	// Check for the hit-scan gauntlet, don't let the action
	// go through as an attack unless it actually hits something.
	if (client.ps.weapon === WP.GAUNTLET && !(cmd.buttons & BUTTON.TALK) &&
		(cmd.buttons & BUTTON.ATTACK) && client.ps.weaponTime <= 0) {
		pm.gauntletHit = CheckGauntletAttack(ent);
	}
	if (ent.flags & GFL.FORCE_GESTURE) {
		ent.flags &= ~GFL.FORCE_GESTURE;
		ent.client.pers.cmd.buttons |= BUTTON.GESTURE;
	}

	// Copy off position before pmove.
	vec3.set(client.ps.origin, client.oldOrigin);

	bg.Pmove(pm);

	// Save results of pmove.
	if (ent.client.ps.eventSequence !== oldEventSequence) {
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

	if (!ent.client.noclip) {
		TouchTriggers(ent);
	}

	// NOTE: Now copy the exact origin over otherwise clients can be snapped into solid.
	vec3.set(client.ps.origin, ent.currentOrigin);

	// Touch other objects.
	ClientImpacts(ent, pm);

	// // Save results of triggers and client events.
	// if (ent.client.ps.eventSequence != oldEventSequence) {
	// 	ent.eventTime = level.time;
	// }

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
	// If we are doing a chase cam or a remote view, grab the latest info
	if (ent.client.sess.spectatorState === SPECTATOR.FOLLOW) {
		var clientNum = ent.client.sess.spectatorClient;

		// Team follow1 and team follow2 go to whatever clients are playing.
		if (clientNum === -1) {
			clientNum = level.follow1;
		} else if (clientNum === -2) {
			clientNum = level.follow2;
		}

		if (clientNum >= 0) {
			var client = level.clients[clientNum];
			if (client.pers.connected === CON.CONNECTED && client.sess.spectatorState === SPECTATOR.NOT) {
				var flags = (client.ps.eFlags & ~(EF.VOTED | EF.TEAMVOTED)) | (ent.client.ps.eFlags & (EF.VOTED | EF.TEAMVOTED));
				ent.client.ps = client.ps;
				ent.client.ps.pm_flags |= PMF.FOLLOW;
				ent.client.ps.eFlags = flags;
				return;
			} else {
				// Drop them to free spectators unless they are dedicated camera followers.
				if (ent.client.sess.spectatorClient >= 0) {
					ent.client.sess.spectatorState = SPECTATOR.FREE;
					ClientBegin(ent.s.number);
				}
			}
		}
	}

	if (ent.client.sess.spectatorState === SPECTATOR.SCOREBOARD) {
		ent.client.ps.pm_flags |= PMF.SCOREBOARD;
	} else {
		ent.client.ps.pm_flags &= ~PMF.SCOREBOARD;
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
		var angles = [0, 0, 0];
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
	if (ent.client.noclip) {
		ent.client.airOutTime = level.time + 12000;	// don't need air
		return;
	}

	var waterlevel = ent.waterlevel;
	var envirosuit = ent.client.ps.powerups[PW.BATTLESUIT] > level.time;

	//
	// Check for drowning.
	//
	if (waterlevel === 3) {
		// Envirosuit gives air.
		if (envirosuit) {
			ent.client.airOutTime = level.time + 10000;
		}

		// If out of air, start drowning.
		if (ent.client.airOutTime < level.time) {
			// drown!
			ent.client.airOutTime += 1000;
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
		ent.client.airOutTime = level.time + 12000;
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

/**
 * SetClientSound
 */
function SetClientSound(ent) {
	// if (ent.waterlevel && (ent.watertype & (CONTENTS.LAVA|CONTENTS.SLIME))) {
	// 	ent.client.ps.loopSound = level.snd_fry;
	// } else {
	// 	ent.client.ps.loopSound = 0;
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
	var range = [40, 40, 52];
	var mins = [0, 0, 0];
	var maxs = [0, 0, 0];

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
			if (!bg.PlayerTouchesItem(ent.client.ps, hit.s, level.time)) {
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