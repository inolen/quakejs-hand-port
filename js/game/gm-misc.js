/**
 * TeleportPlayer
 */
function TeleportPlayer(player, origin, angles) {
	var noAngles = (angles[0] > 999999.0);

	// use temp events at source and destination to prevent the effect
	// from getting dropped by a second player event
	/*if ( player->client->sess.sessionTeam != TEAM_SPECTATOR ) {
		tent = G_TempEntity( player->client->ps.origin, EV_PLAYER_TELEPORT_OUT );
		tent->s.clientNum = player->s.clientNum;

		tent = G_TempEntity( origin, EV_PLAYER_TELEPORT_IN );
		tent->s.clientNum = player->s.clientNum;
	}*/

	// unlink to make sure it can't possibly interfere with G_KillBox
	sv.UnlinkEntity(player);

	vec3.set(origin, player.client.ps.origin);
	player.client.ps.origin[2] += 1;

	if (!noAngles) {
		// spit the player out
		AnglesToVectors(angles, player.client.ps.velocity, null, null);
		vec3.scale(player.client.ps.velocity, 400);
		player.client.ps.pm_time = 160;  // hold time
		player.client.ps.pm_flags |= PmoveFlags.TIME_KNOCKBACK;

		// set angles
		SetClientViewAngle(player, angles);
	}

	// toggle the teleport bit so the client knows to not lerp
	player.client.ps.eFlags ^= EntityFlags.TELEPORT_BIT;
	// kill anything at the destination
	/*if ( player->client->sess.sessionTeam != TEAM_SPECTATOR ) {
		G_KillBox (player);
	}*/

	// save results of pmove
	bg.PlayerStateToEntityState(player.client.ps, player.s);

	// use the precise origin for linking
	vec3.set(player.client.ps.origin, player.currentOrigin);

	//if ( player->client->sess.sessionTeam != TEAM_SPECTATOR ) {
		sv.LinkEntity(player);
	//}
}