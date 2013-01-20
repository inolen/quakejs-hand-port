/**
 * QUAKED worldspawn (0 0 0) ?
 *
 * Every map should have exactly one worldspawn.
 * "music"    music wav file
 * "gravity"  800 is default gravity
 * "message"  Text to print during connection process
 */
spawnFuncs['worldspawn'] = function (self) {
	// TODO Manually spawn the first entity so this check is valid.
	// if (self.classname !== 'worldspawn') {
	// 	error('worldspawn: The first entity isn\'t \'worldspawn\'');
	// }

	// Make some data visible to connecting client.
	// sv.SetConfigstring( CS_GAME_VERSION, GAME_VERSION );
	// sv.SetConfigstring( CS_MOTD, g_motd.string );  // message of the day

	sv.SetConfigstring('levelStartTime', level.startTime);

	var music = SpawnString('music', '');
	// Convert slashes and strip extension.
	music = music.replace('\\', '/').replace(/\.[^\/.]+$/, '');
	sv.SetConfigstring('music', music);

	var message = SpawnString('message', '');
	sv.SetConfigstring('message', message);  // map specific message

	// G_SpawnString( "gravity", "800", &s );
	// trap_Cvar_Set( "g_gravity", s );

	// G_SpawnString( "enableDust", "0", &s );
	// trap_Cvar_Set( "g_enableDust", s );

	// G_SpawnString( "enableBreath", "0", &s );
	// trap_Cvar_Set( "g_enableBreath", s );

	level.gentities[ENTITYNUM_WORLD].s.number = ENTITYNUM_WORLD;
	level.gentities[ENTITYNUM_WORLD].ownerNum = ENTITYNUM_NONE;
	level.gentities[ENTITYNUM_WORLD].classname = 'worldspawn';

	level.gentities[ENTITYNUM_NONE].s.number = ENTITYNUM_NONE;
	level.gentities[ENTITYNUM_NONE].ownerNum = ENTITYNUM_NONE;
	level.gentities[ENTITYNUM_NONE].classname = 'nothing';
};