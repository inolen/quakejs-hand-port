define('server/sv-cmd', [], function () {
	return function (bg) {
		var sv = this;

		return {
			CommandInit: function () {
				sv.CommandAdd('map', sv.CommandLoadMap);
			},

			/**
			 * Commands
			 */
			CommandLoadMap: function (mapName) {
				console.log('command load map');
				sv.SpawnServer(mapName);
			}
		};
	};
});