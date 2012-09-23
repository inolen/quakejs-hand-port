var sv = new ServerLocals();
var svs = new ServerStatic();

// TODO move this out
var map;

function Init() {
	// Due to sv/cl/com having a circular dependency on eachother,
	// we need to re-grab com now that we're all loaded.
	// http://requirejs.org/docs/api.html#circular
	com = require('common/com');
	
	com.CvarAdd('sv_mapname', 'nomap');

	CmdInit();
	NetInit();

	// For dev purposes, simulate command line input.
	setTimeout(function () {
		CmdLoadMap('q3dm6');
	}, 0);
}

function Frame(frameTime, msec) {
	NetFrame();
	SendClientMessages();
}

function SpawnServer(mapName) {
	console.log('SV: Spawning new server instance running: ' + mapName);
	cl.MapLoading(); // This function name sucks.
	cm.LoadMap(mapName);

	com.CvarSet('sv_mapname', mapName);

	gm.Init({
		GetEntities: GetEntities
	});
}

/**
 * Interface functions passed to the game module.
 */
function GetEntities() {
	return cm.GetEntities();
}