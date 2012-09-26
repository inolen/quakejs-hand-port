var sv = new ServerLocals();
var svs = new ServerStatic();

function Init() {
	// Due to sv/cl/com having a circular dependency on eachother,
	// we need to re-grab com now that we're all loaded.
	// http://requirejs.org/docs/api.html#circular
	com = require('common/com');
	
	com.CvarAdd('sv_mapname', 'nomap');
	//com.CvarAdd('sv_fps',     '20');

	CmdInit();
	NetInit();

	// For dev purposes, simulate command line input.
	setTimeout(function () {
		CmdLoadMap('q3dm7');
	}, 0);
}

/*function FrameMsec() {
	var fps = com.CvarGet('sv_fps');
	var frameMsec = 1000 / fps;

	if (frameMsec < 1) {
		frameMsec = 1
	}

	return frameMsec;
}*/

function Frame(frameTime, msec) {
	/*var frameMsec = FrameMsec();
	sv.timeResidual += msec;*/

	NetFrame();

	/*// run the game simulation in chunks
	while ( sv.timeResidual >= frameMsec ) {
		sv.timeResidual -= frameMsec;
		svs.time += frameMsec;
		sv.time += frameMsec;

		// let everything in the world think and move
		VM_Call (gvm, GAME_RUN_FRAME, sv.time);
	}*/

	SendClientMessages();
}

function SpawnServer(mapName) {
	console.log('SV: Spawning new server instance running: ' + mapName);
	cm.LoadMap(mapName, _.bind(function () {
		com.CvarSet('sv_mapname', mapName);

		// clear physics interaction links
		ClearWorld();

		// Let the local client now to reconnect.
		// This function name sucks btw.
		cl.MapLoading();

		gm.Init(gmExports);
	}, this));
}