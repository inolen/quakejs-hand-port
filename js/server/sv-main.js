var svs;
var sv;

// TODO move this out
var map;

function Init() {
	// Due to sv/cl/com having a circular dependency on eachother,
	// we need to re-grab com now that we're all loaded.
	// http://requirejs.org/docs/api.html#circular
	com = require('common/com');
	
	svs = new ServerStatic();
	sv = new ServerLocals();

	CmdInit();
	NetInit();

	// For dev purposes, simulate command line input.
	setTimeout(function () {
		CmdLoadMap('q3dm6');
	}, 0);
}

function Frame(frameTime, msec) {
	NetFrame();
	//CheckTimeouts();
	SendClientMessages();
}

function SpawnServer(mapName) {
	console.log('SV: Spawning new server instance running: ' + mapName);
	cl.MapLoading();
	//cm.LoadMap(map);

	console.log('ARE WE SPAWNING A SERVER OR WHAT MOTHER FUCKER?!?!?!');

	map = new Q3Bsp();
	map.load('../' + Q3W_BASE_FOLDER + '/maps/' + mapName + '.bsp', function () {
		gm.Init({
			GetEntities: GetEntities
		});

		// TODO RE-CONNECT ALL CLIENTS AND HAVE THEM LOAD MAP
	});
}

/**
 * Interface functions passed to the game module.
 */
function GetEntities() {
	return map.data.entities;
}