/**
 * TeleportPlayer
 */
function TeleportPlayer(player, origin, angles) {
	var noAngles = (angles[0] > 999999.0);

	// Use temp events at source and destination to prevent the effect
	// from getting dropped by a second player event.
	if (player.client.sess.sessionTeam !== TEAM.SPECTATOR) {
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
	if (player.client.sess.sessionTeam !== TEAM.SPECTATOR) {
		KillBox(player);
	}

	// Save results of pmove.
	bg.PlayerStateToEntityState(player.client.ps, player.s);

	// Use the precise origin for linking.
	vec3.set(player.client.ps.origin, player.currentOrigin);

	if (player.client.sess.sessionTeam !== TEAM.SPECTATOR) {
		sv.LinkEntity(player);
	}
}