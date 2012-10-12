var sys;
var dedicated;

var sv;
var svs;

var sv_serverid;
var sv_mapname;
var sv_fps;

function Init(sys_, dedicated_) {
	sys = sys_;
	dedicated = dedicated_;

	sv = new ServerLocals();
	svs = new ServerStatic();
	
	sv_serverid = cvar.AddCvar('sv_serverid', 1337);
	sv_mapname = cvar.AddCvar('sv_mapname', 'nomap');
	sv_fps = cvar.AddCvar('sv_fps',     20);

	CmdInit();
	NetInit();

	// For dev purposes, simulate command line input.
	setTimeout(function () {
		CmdLoadMap('q3tourney4');
	}, 100);
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
	
	if (!sv || !sv.initialized) {
		return;
	}

	var frameMsec = FrameMsec();
	sv.timeResidual += msec;

	NetFrame();

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

function SpawnServer(mapName) {
	console.log('SV: Spawning new server instance running: ' + mapName);

	sv.initialized = false;
	
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
		cvar.SetCvar('sv_mapname', mapName);
		// serverid should be different each time.
		cvar.SetCvar('sv_serverid', svs.frameTime);

		// Clear physics interaction links.
		ClearWorld();

		// Initialize the game.
		gm.Init(sys, gameExports);

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
			
			client.oldServerTime = oldServerTime; // save when the server started for each client already connected
			client.deltaMessage = -1;
			client.lastSnapshotTime = 0; // generate a snapshot immediately

			gm.ClientBegin(i);
		}	

		/*// Run another frame to allow things to look at all the players.
		gm.Frame(sv.time);
		sv.time += 100;
		svs.time += 100;*/

		sv.initialized = true;
	});
}