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
 * Init
 */
function Init(sysinterface, cominterface, isdedicated) {
	console.log('--------- SV Init ---------');
	
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
		frameMsec = 1
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

	// Don't send out duplicate snapshots if we didn't run any gameframes.
	if (frames > 0) {
		SendClientMessages();
	}
}

/**
 * PacketEvent
 */
function PacketEvent(addr, socket, buffer) {	
	if (!svs.initialized) {
		return;
	}

	var msg = new ByteBuffer(buffer, ByteBuffer.LITTLE_ENDIAN);

	// Peek in and see if this is a string message.
	if (buffer.byteLength > 4 && msg.view.getInt32(0, !!ByteBuffer.LITTLE_ENDIAN) === -1) {
		ConnectionlessPacket(addr, socket, msg);
		return;
	}

	for (var i = 0; i < svs.clients.length; i++) {
		var client = svs.clients[i];

		if (client.state === ClientState.FREE) {
			continue;
		}

		if (!_.isEqual(client.netchan.addr, addr)) {
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
function ConnectionlessPacket(addr, socket, msg) {
	msg.readInt();  // Skip the -1.

	var str = msg.readCString();

	if (str.indexOf('connect') === 0) {
		ClientConnect(addr, socket, str.substr(8));
	}
}

/**
 * SpawnServer
 */
function SpawnServer(mapName) {
	console.log('--------- SV SpawnServer ---------');
	console.log('Spawning new server for ' + mapName);

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
			Trace:             cm.Trace
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
	SendServerCommand(client, 'cs ' + key + ' ' + JSON.stringify(sv.configstrings[key]) + '\n');
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
		throw new Error('GetUserinfo: bad index ' + clientNum);
	}

	return svs.clients[clientNum].userinfo;
}
