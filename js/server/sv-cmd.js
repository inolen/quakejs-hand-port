function CmdInit() {
	cmd.AddCmd('map', CmdLoadMap);
	cmd.AddCmd('sectorlist', CmdSectorList);
}

function CmdLoadMap(mapName) {
	SpawnServer(mapName);
}