var svs;
var sv;

function Init() {
	// Due to sv/cl/com having a circular dependency on eachother,
	// we need to re-grab com now that we're all loaded.
	// http://requirejs.org/docs/api.html#circular
	com = require('common/com');
	
	svs = new ServerStatic();
	sv = new Server();

	CmdInit();
	NetInit();
}

function Frame(frameTime, msec) {
	NetFrame();
	//CheckTimeouts();
	SendClientMessages();
}

function SpawnServer(map) {
	console.log('SV: Spawning new server instance running: ' + map);
	cl.MapLoading();
	cm.LoadMap(map);
	// TODO RE-CONNECT ALL CLIENTS AND HAVE THEM LOAD MAP

	gm.Init();
}