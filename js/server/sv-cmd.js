function CmdInit() {
	com.CmdAdd('map', _.bind(CmdLoadMap, this));
	com.CmdAdd('sectorlist', _.bind(CmdSectorList, this));
}

function CmdLoadMap(mapName) {
	SpawnServer(mapName);
}