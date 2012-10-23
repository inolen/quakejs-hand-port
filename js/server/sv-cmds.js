/**
 * InitCmds
 */
function InitCmds() {
	com.AddCmd('map', CmdLoadMap);
	com.AddCmd('sectorlist', CmdSectorList);
}

/**
 * CmdLoadMap
 */
function CmdLoadMap(mapName) {
	SpawnServer(mapName);
}