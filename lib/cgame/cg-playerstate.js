/**
 * TransitionPlayerState
 */
function TransitionPlayerState(ps, ops) {
	// check for changing follow mode
	/*if (ps.clientNum !== ops.clientNum) {
		cg.thisFrameTeleport = qtrue;
		// make sure we don't get any unwanted transition effects
		*ops = *ps;
	}*/

	// damage events (player is getting wounded)
	/*if ( ps->damageEvent != ops->damageEvent && ps->damageCount ) {
		CG_DamageFeedback( ps->damageYaw, ps->damagePitch, ps->damageCount );
	}*/

	// Respawning.
	if (ps.persistant[Persistant.SPAWN_COUNT] != ops.persistant[Persistant.SPAWN_COUNT] ) {
		Respawn();
	}

	/*if ( cg.mapRestart ) {
		CG_Respawn();
		cg.mapRestart = qfalse;
	}*/

	/*if ( cg.snap->ps.pm_type != PM_INTERMISSION 
		&& ps->persistant[PERS_TEAM] != TEAM_SPECTATOR ) {
		CG_CheckLocalSounds( ps, ops );
	}*/

	// check for going low on ammo
	//CG_CheckAmmo();

	// run events
	//CG_CheckPlayerstateEvents( ps, ops );

	/*// smooth the ducking viewheight change
	if ( ps->viewheight != ops->viewheight ) {
		cg.duckChange = ps->viewheight - ops->viewheight;
		cg.duckTime = cg.time;
	}*/
}

/**
 * Respawn
 * 
 * A respawn happened this snapshot
 */
function Respawn() {
	// No error decay on player movement.
	cg.thisFrameTeleport = true;

	// Display weapons available.
	//cg.weaponSelectTime = cg.time;

	// Select the weapon the server says we are using.
	cg.weaponSelect = cg.snap.ps.weapon;
}