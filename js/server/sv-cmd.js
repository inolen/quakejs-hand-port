function CmdInit() {
	cmd.AddCmd('map', _.bind(CmdLoadMap, this));
	cmd.AddCmd('sectorlist', _.bind(CmdSectorList, this));
}

function CmdLoadMap(mapName) {
	SpawnServer(mapName);
}