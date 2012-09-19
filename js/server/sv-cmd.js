define('server/sv-cmd', [], function () {
	return function (bg) {
		var sv = this;

		function CmdInit() {
			sv.CmdAdd('map', sv.CmdLoadMap);
		}

		function CmdLoadMap(mapName) {
			console.log('command load map');
			sv.SpawnServer(mapName);
		}

		return {
			CmdInit: CmdInit,
			CmdLoadMap: CmdLoadMap
		};
	};
});