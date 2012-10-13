function CmdInit() {
	com.AddCmd('map', CmdLoadMap);
	com.AddCmd('sectorlist', CmdSectorList);
}

function CmdLoadMap(mapName) {
	SpawnServer(mapName);
}