define('server/sv-cmd', [], function () {
	return function (q_bg) {
		var q_sv = this;

		return {
			CommandInit: function () {
				q_sv.q_com.CommandAdd('map', q_sv.CommandLoadMap);
			},

			/**
			 * Commands
			 */
			CommandLoadMap: function (mapName) {
				console.log('command load map');
				q_sv.SpawnServer(mapName);
			}
		};
	};
});