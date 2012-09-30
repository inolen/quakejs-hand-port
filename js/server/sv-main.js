var sv = new ServerLocals();
var svs = new ServerStatic();

var sv_mapname;
var sv_fps;

function Init() {
	// Due to sv/cl/com having a circular dependency on eachother,
	// we need to re-grab com now that we're all loaded.
	// http://requirejs.org/docs/api.html#circular
	com = require('common/com');
	
	sv_mapname = com.CvarAdd('sv_mapname', 'nomap');
	sv_fps = com.CvarAdd('sv_fps',     '20');

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
	var frameMsec = FrameMsec();
	sv.timeResidual += msec;

	if (!svs.initialized) {
		return;
	}

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

	cm.LoadMap(mapName, _.bind(function () {
		com.CvarSet('sv_mapname', mapName);

		// clear physics interaction links
		ClearWorld();

		// Let the local client know to reconnect.
		cl.ServerSpawning();

		svs.initialized = true;

		gm.Init(gmExports);
	}, this));
}