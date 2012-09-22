var cl;
var svs;
var sv;

function Init(cl) {
	cl = cl;
	svs = new ServerStatic();
	sv = new Server();

	CmdInit();
	NetInit();
}

function Frame() {
	NetFrame();
	//CheckTimeouts();
	SendClientMessages();
}

function SpawnServer(map) {
	cl.MapLoading();
	// TODO RE-CONNECT ALL CLIENTS AND HAVE THEM LOAD MAP
}