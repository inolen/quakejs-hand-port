function CmdInit() {
	com.CmdAdd('map', _.bind(CmdLoadMap, this));
}

function CmdLoadMap(mapName) {
	SpawnServer(mapName);
}