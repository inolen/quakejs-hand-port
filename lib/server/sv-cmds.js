/**
 * RegisterCommands
 */
function RegisterCommands() {
	COM.AddCmd('map', CmdLoadMap);
	COM.AddCmd('map_restart', CmdRestartMap);
	COM.AddCmd('sectorlist', CmdSectorList);
}

/**
 * CmdLoadMap
 */
function CmdLoadMap(mapName) {
	Spawn(mapName);
}

/**
 * CmdRestartMap
 *
 * Completely restarts a level, but doesn't send a new gamestate to the clients.
 * This allows fair starts with variable load times.
 */
function CmdRestartMap(delayString) {
	// Make sure we aren't restarting twice in the same frame.
	if (COM.frameTime === sv_serverid.getAsInt()) {
		return;
	}

	// Make sure server is running.
	// if ( !com_sv_running->integer ) {
	// 	log('Server is not running.'');
	// 	return;
	// }

	if (sv.restartTime) {
		return;
	}

	// Check for changes in latched variables that would
	// require a full restart.
	if (COM.RelatchCvar('sv_maxClients')) {
		log('Restart map is doing a hard restart - sv_maxClients changed.');

		// Restart the map the slow way.
		Spawn(sv_mapname.getAsString());
		return;
	}

	// Toggle the server bit so clients can detect that a
	// map_restart has happened.
	svs.snapFlagServerBit ^= QS.SNAPFLAG_SERVERCOUNT;

	// Generate a new serverid.
	// TTimo - don't update restartedserverId there, otherwise we won't deal correctly with multiple map_restart.
	sv.serverId = COM.frameTime;
	sv_serverid.set(sv.serverId);

	// If a map_restart occurs while a client is changing maps, we need
	// to give them the correct time so that when they finish loading
	// they don't violate the backwards time check in cl_cgame.c
	for (var i = 0; i < sv_maxClients.getAsInt(); i++) {
		if (svs.clients[i].state === CS.PRIMED) {
			svs.clients[i].oldServerTime = sv.restartTime;
		}
	}

	// Note that we do NOT set sv.state = SS_LOADING, so configstrings that
	// had been changed from their default values will generate broadcast updates.
	sv.state = SS.LOADING;
	sv.restarting = true;

	ShutdownGame();
	InitGame();

	// Run a few frames to allow everything to settle.
	for (var i = 0; i < 3; i++) {
		GM.Frame(sv.time);
		sv.time += 100;
		svs.time += 100;
	}

	sv.state = SS.GAME;
	sv.restarting = false;

	// Connect and begin all the clients.
	for (var i = 0; i < sv_maxClients.getAsInt(); i++) {
		var client = svs.clients[i];

		// Send the new gamestate to all connected clients.
		if (client.state < CS.CONNECTED) {
			continue;
		}

		// Add the map_restart command.
		AddServerCommand(client, 'map_restart');

		// Connect the client again, without the firstTime flag.
		var denied = GM.ClientConnect(i, false);
		if (denied) {
			// this generally shouldn't happen, because the client
			// was connected before the level change
			DropClient(client, denied);
			log('MapRestart: dropped client', i, '- denied!');
			continue;
		}

		if (client.state === CS.ACTIVE) {
			ClientEnterWorld(client, client.lastUserCmd);
		} else {
			// If we don't reset client.lastUserCmd and are restarting during map load,
			// the client will hang because we'll use the last Usercmd from the previous map,
			// which is wrong obviously.
			ClientEnterWorld(client, null);
		}
	}

	// Run another frame to allow things to look at all the players.
	GM.Frame(sv.time);
	sv.time += 100;
	svs.time += 100;
}
