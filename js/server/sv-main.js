define('server/sv-main', [], function () {
	return function (bg) {
		var sv = this;

		return {
			Init: function () {
				sv.clients = new Array();

				sv.CommandInit();
				sv.NetInit();
			},

			Frame: function () {
				sv.NetFrame();
			},

			SpawnServer: function (map) {
				sv.q_com.MapLoading();
				// TODO CHECK IF CLIENT IS RUNNING LOCAL SERVER, IF SO CONNECT THEM
				// TODO RE-CONNECT ALL CLIENTS AND HAVE THEM LOAD MAP
			}
		};
	};
});