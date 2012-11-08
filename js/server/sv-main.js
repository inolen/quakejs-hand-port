var sys;
var com;
var dedicated;

var sv;
var svs;
var cm;

var sv_serverid;
var sv_mapname;
var sv_fps;

/**
 * log
 */
function log() {
	var args = Array.prototype.slice.call(arguments);
	args.splice(0, 0, 'SV:');
	Function.apply.call(console.log, console, args);
}

/**
 * Init
 */
function Init(sysinterface, cominterface, isdedicated) {
	log('Initializing');
	
	sys = sysinterface;
	com = cominterface;
	dedicated = isdedicated;

	sv = new ServerLocals();
	svs = new ServerStatic();
	cm = clipmap.CreateInstance(sys);
	
	sv_serverid = com.AddCvar('sv_serverid', 0, CvarFlags.SYSTEMINFO);
	sv_mapname = com.AddCvar('sv_mapname', 'nomap', CvarFlags.SERVERINFO);
	sv_fps = com.AddCvar('sv_fps', 20);

	RegisterCommands();

	// For dev purposes, simulate command line input.
	setTimeout(function () {
		CmdLoadMap('q3tourney2');
	}, 50);
}

/**
 * FrameMsec
 * 
 * Calculate the # of milliseconds for a single frame.
 */
function FrameMsec() {
	var fps = sv_fps();
	var frameMsec = 1000 / fps;

	if (frameMsec < 1) {
		frameMsec = 1;
	}

	return frameMsec;
}

/**
 * Frame
 */
function Frame(frameTime, msec) {
	svs.frameTime = frameTime;
	
	if (!svs.initialized) {
		return;
	}

	var frameMsec = FrameMsec();
	sv.timeResidual += msec;

	// Run the game simulation in chunks.
	var frames = 0;
	while (sv.timeResidual >= frameMsec) {
		sv.timeResidual -= frameMsec;
		svs.time += frameMsec;
		sv.time += frameMsec;

		// Let everything in the world think and move.
		gm.Frame(sv.time);
		frames++;
	}

	CheckTimeouts();

	// Don't send out duplicate snapshots if we didn't run any gameframes.
	if (frames > 0) {
		SendClientMessages();
	}
}

/**
 * CheckTimeouts
 * 
 * If a packet has not been received from a client for timeout->integer 
 * seconds, drop the conneciton. Server time is used instead of
 * realtime to avoid dropping the local client while debugging.
 * 
 * When a client is normally dropped, the client_t goes into a zombie state
 * for a few seconds to make sure any final reliable message gets resent
 * if necessary
 */
function CheckTimeouts() {
	// int		i;
	// client_t	*cl;
	// int			droppoint;
	// int			zombiepoint;

	// droppoint = svs.time - 1000 * sv_timeout->integer;
	// zombiepoint = svs.time - 1000 * sv_zombietime->integer;

	// for (i=0,cl=svs.clients ; i < sv_maxclients->integer ; i++,cl++) {
	// 	// message times may be wrong across a changelevel
	// 	if (cl->lastPacketTime > svs.time) {
	// 		cl->lastPacketTime = svs.time;
	// 	}

	// 	if (cl->state == CS_ZOMBIE
	// 	&& cl->lastPacketTime < zombiepoint) {
	// 		// using the client id cause the cl->name is empty at this point
	// 		Com_DPrintf( "Going from CS_ZOMBIE to CS_FREE for client %d\n", i );
	// 		cl->state = CS_FREE;	// can now be reused
	// 		continue;
	// 	}
	// 	if ( cl->state >= CS_CONNECTED && cl->lastPacketTime < droppoint) {
	// 		// wait several frames so a debugger session doesn't
	// 		// cause a timeout
	// 		if ( ++cl->timeoutCount > 5 ) {
	// 			SV_DropClient (cl, "timed out"); 
	// 			cl->state = CS_FREE;	// don't bother with zombie state
	// 		}
	// 	} else {
	// 		cl->timeoutCount = 0;
	// 	}
	// }
}

/**
 * PacketEvent
 */
function PacketEvent(socket, buffer) {	
	if (!svs.initialized) {
		return;
	}

	var msg = new ByteBuffer(buffer, ByteBuffer.LITTLE_ENDIAN);

	// Peek in and see if this is a string message.
	if (buffer.byteLength > 4 && msg.view.getInt32(0, !!ByteBuffer.LITTLE_ENDIAN) === -1) {
		ConnectionlessPacket(socket, msg);
		return;
	}

	for (var i = 0; i < svs.clients.length; i++) {
		var client = svs.clients[i];

		if (client.state === ClientState.FREE) {
			continue;
		}

		if (client.netchan.socket !== socket) {
			continue;
		}

		if (com.NetchanProcess(client, msg)) {
			ExecuteClientMessage(client, msg);
		}
		return;
	}
}

/**
 * ConnectionlessPacket
 */
function ConnectionlessPacket(socket, msg) {
	msg.readInt();  // Skip the -1.

	var str = msg.readCString();

	if (str.indexOf('connect') === 0) {
		AcceptClient(socket, str.substr(8));
	}
}

/**
 * SpawnServer
 */
function SpawnServer(mapName) {
	log('Spawning new server for ' + mapName);

	svs.initialized = false;
	
	// Shutdown the game.
	gm.Shutdown();
	
	if (!dedicated) {
		// Update the local client's screen.
		cl.MapLoading();

		// Make sure all the client stuff is unloaded.
		cl.ShutdownCGame();
		cl.ShutdownRenderer();

		// Restart renderer.
		cl.InitRenderer();
	}

	// Toggle the server bit so clients can detect that a server has changed.
	svs.snapFlagServerBit ^= SNAPFLAG_SERVERCOUNT;

	// Wipe the entire per-level structure.
	var oldServerTime = sv.time;
	sv = new ServerLocals();

	// Load the collision map.
	cm.LoadMap(mapName, function () {
		sv_mapname(mapName);
		// serverid should be different each time.
		sv_serverid(svs.frameTime);

		// Clear physics interaction links.
		ClearWorld();

		// Media configstring setting should be done during
		// the loading stage, so connected clients don't have
		// to load during actual gameplay.
		sv.state = ServerState.LOADING;

		// Initialize the game.
		var exports = {
			LocateGameData:    LocateGameData,
			GetUserCommand:    GetUserCommand,
			GetConfigstring:   GetConfigstring,
			SetConfigstring:   SetConfigstring,
			GetUserinfo:       GetUserinfo,
			SetBrushModel:     SetBrushModel,
			LinkEntity:        LinkEntity,
			UnlinkEntity:      UnlinkEntity,
			FindEntitiesInBox: FindEntitiesInBox,
			GetEntityDefs:     cm.EntityDefs,
			Trace:             Trace
		};
		gm.Init(com, exports);

		/*// Run a few frames to allow everything to settle.
		for (var i = 0; i < 3; i++) {
			gm.Frame(sv.time);
			sv.time += 100;
			svs.time += 100;
		}*/

		// Send the new gamestate to all connected clients.
		for (var i = 0; i < MAX_CLIENTS; i++) {
			var client = svs.clients[i];

			if (!client || client.state < ClientState.CONNECTED) {
				continue;
			}
			
			// Clear gentity pointer to prevent bad snapshots from building.
			client.gentity = null;

			// Reconnect.
			var denied = gm.ClientConnect(i, false);

			if (denied) {
				DropClient(client, denied);
			}

			// When we get the next packet from a connected client,
			// the new gamestate will be sent.
			client.state = ClientState.CONNECTED;
		}	

		/*// Run another frame to allow things to look at all the players.
		gm.Frame(sv.time);
		sv.time += 100;
		svs.time += 100;*/

		SetConfigstring('systemInfo', com.GetCvarKeyValues(CvarFlags.SYSTEMINFO));
		SetConfigstring('serverInfo', com.GetCvarKeyValues(CvarFlags.SERVERINFO));

		// Any media configstring setting now should issue a warning
		// and any configstring changes should be reliably transmitted
		// to all clients.
		sv.state = ServerState.GAME;

		svs.initialized = true;
	});
}

/**
 * GetConfigstring
 */
function GetConfigstring(key) {
	return sv.configstrings[key];
}

/**
 * SetConfigstring
 */
function SetConfigstring(key, val) {
	// Don't bother broadcasting an update if no change.
	if (_.isEqual(val, sv.configstrings[key])) {
		return;
	}

	// Change the string.
	sv.configstrings[key] = val;

	// Send it to all the clients if we aren't spawning a new server.
	if (sv.state === ServerState.GAME || sv.restarting) {
		// Send the data to all relevent clients
		for (var i = 0; i < MAX_CLIENTS; i++) {
			var client = svs.clients[i];

			if (client.state < ClientState.ACTIVE) {
				if (client.state === ClientState.PRIMED) {
					client.csUpdated[key] = true;
				}
				continue;
			}
		
			SendConfigstring(client, key);
		}
	}
}

/**
 * SendConfigString
 *
 * Creates and sends the server command necessary to update the CS index for the
 * given client.
 */
function SendConfigstring(client, key) {
	//SendServerCommand(client, 'cs ' + key + ' ' + JSON.stringify(sv.configstrings[key]) + '\n');
}

/**
 * UpdateConfigstrings
 * 
 * Called when a client goes from ClientState.PRIMED to ClientState.ACTIVE. Updates all
 * Configstring indexes that have changed while the client was in ClientState.PRIMED.
 */
function UpdateConfigstrings(client) {
	for (var key in sv.configstrings) {
		if (!sv.configstrings.hasOwnProperty(key)) {
			continue;
		}

		// If the CS hasn't changed since we went to ClientState.PRIMED, ignore.
		if (!client.csUpdated[key]) {
			continue;
		}

		SendConfigstring(client, key);
		client.csUpdated[key] = false;
	}
}

/**
 * GetUserInfo
 */
function GetUserinfo(clientNum) {
	if (clientNum < 0 || clientNum >= MAX_CLIENTS) {
		com.error(Err.DROP, 'GetUserinfo: bad index ' + clientNum);
	}

	return svs.clients[clientNum].userinfo;
}
