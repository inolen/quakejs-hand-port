var cl;

function Init(cl) {
	cl = cl;
	clients = new Array();

	CmdInit();
	NetInit();
}

function Frame() {
	NetFrame();
}

function SpawnServer(map) {
	cl.MapLoading();
	// TODO RE-CONNECT ALL CLIENTS AND HAVE THEM LOAD MAP
}