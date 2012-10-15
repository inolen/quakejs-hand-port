var com;
var dedicated;

var sv;
var svs;
var cm;

var sv_serverid;
var sv_mapname;
var sv_fps;

function Init(cominterface, isdedicated) {
	com = cominterface;
	dedicated = isdedicated;

	sv = new ServerLocals();
	svs = new ServerStatic();
	cm = clipmap.CreateInstance({ ReadFile: com.ReadFile });
	
	sv_serverid = com.AddCvar('sv_serverid', 1337);
	sv_mapname = com.AddCvar('sv_mapname', 'nomap');
	sv_fps = com.AddCvar('sv_fps', 20);

	InitCmd();

	// For dev purposes, simulate command line input.
	setTimeout(function () {
		LoadMapCmd('q3tourney2');
	}, 50);
}

function FrameMsec() {
	var fps = sv_fps();
	var frameMsec = 1000 / fps;

	if (frameMsec < 1) {
		frameMsec = 1
	}

	return frameMsec;
}

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

function PacketEvent(addr, buffer) {
	if (!svs.initialized) {
		return;
	}

	var msg = new ByteBuffer(buffer, ByteBuffer.LITTLE_ENDIAN);

	for (i = 0; i < svs.clients.length; i++) {
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
		com.SetCvar('sv_mapname', mapName);
		// serverid should be different each time.
		com.SetCvar('sv_serverid', svs.frameTime);

		// Clear physics interaction links.
		ClearWorld();

		// Initialize the game.
		var gminterface = {
			AddCmd:            com.AddCmd,
			AddCvar:           com.AddCvar,
			GetEntityDefs:     cm.EntityDefs,
			LocateGameData:    LocateGameData,
			SetBrushModel:     SetBrushModel,
			LinkEntity:        LinkEntity,
			UnlinkEntity:      UnlinkEntity,
			FindEntitiesInBox: FindEntitiesInBox,
			Trace:             cm.Trace
		};
		gm.Init(gminterface);

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

			// When we get the next packet from a connected client,
			// the new gamestate will be sent.
			client.state = ClientState.CONNECTED;
		}	

		/*// Run another frame to allow things to look at all the players.
		gm.Frame(sv.time);
		sv.time += 100;
		svs.time += 100;*/

		svs.initialized = true;
	});
}