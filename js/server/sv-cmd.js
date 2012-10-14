function InitCmd() {
	com.AddCmd('map', LoadMapCmd);
	com.AddCmd('sectorlist', SectorListCmd);
}

function LoadMapCmd(mapName) {
	SpawnServer(mapName);
}