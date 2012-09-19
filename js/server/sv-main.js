define('server/sv-main', [], function () {
	return function (bg) {
		var sv = this;

		function Init(cl) {
			sv.cl = cl;
			sv.clients = new Array();

			sv.CmdInit();
			sv.NetInit();
		}

		function Frame() {
			sv.NetFrame();
		}

		function SpawnServer(map) {
			sv.cl.MapLoading();
			// TODO RE-CONNECT ALL CLIENTS AND HAVE THEM LOAD MAP
		}

		return {
			Init: Init,
			Frame: Frame,
			SpawnServer: SpawnServer
		};
	};
});