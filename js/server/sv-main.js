var sv;
var svs;

var sv_serverid;
var sv_mapname;
var sv_fps;

function Init() {
	// Due to circular dependencies, we need to re-require com now that we're all loaded.
	// http://requirejs.org/docs/api.html#circular
	sys = require('system/sys');
	com = require('common/com');

	sv = new ServerLocals();
	svs = new ServerStatic();
	
	sv_serverid = com.CvarAdd('sv_serverid', 1337);
	sv_mapname = com.CvarAdd('sv_mapname', 'nomap');
	sv_fps = com.CvarAdd('sv_fps',     20);

	CmdInit();
	NetInit();

	// For dev purposes, simulate command line input.
	setTimeout(function () {
		CmdLoadMap('q3tourney4');
	}, 0);
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

	// run the game simulation in chunks
	while (sv.timeResidual >= frameMsec) {
		sv.timeResidual -= frameMsec;
		svs.time += frameMsec;
		sv.time += frameMsec;

		// let everything in the world think and move
		gm.Frame(sv.time);
	}

	SendClientMessages();
}

function SpawnServer(mapName) {
	console.log('SV: Spawning new server instance running: ' + mapName);

	// Shutdown the game.
	gm.Shutdown();
	
	// Update the local client's screen.
	cl.MapLoading();

	// Make sure all the client stuff is unloaded.
	cl.ShutdownCGame();
	cl.ShutdownRenderer();

	// Restart renderer.
	cl.InitRenderer();

	// Toggle the server bit so clients can detect that a server has changed.
	svs.snapFlagServerBit ^= SNAPFLAG_SERVERCOUNT;

	// Wipe the entire per-level structure.
	var oldServerTime = sv.time;
	sv = new ServerLocals();

	// Load the collision map.
	cm.LoadMap(mapName, _.bind(function () {
		com.CvarSet('sv_mapname', mapName);
		// serverid should be different each time.
		com.CvarSet('sv_serverid', svs.frameTime);

		// Clear physics interaction links.
		ClearWorld();

		// Initialize the game.
		gm.Init(svExports);

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
	}, this));
}