/**
 * InitCmd
 */
function InitCmd() {
	com.AddCmd('map', LoadMapCmd);
	com.AddCmd('sectorlist', SectorListCmd);
}

/**
 * LoadMapCmd
 */
function LoadMapCmd(mapName) {
	SpawnServer(mapName);
}