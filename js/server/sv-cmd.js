function CmdInit() {
	com.CmdAdd('map', CmdLoadMap);
}

function CmdLoadMap(mapName) {
	console.log('command load map');
	SpawnServer(mapName);
}