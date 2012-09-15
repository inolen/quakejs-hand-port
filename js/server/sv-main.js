define('server/sv-main', [], function () {
	return function (q_bg) {
		return {
			Init: function (q_com) {
				this.q_com = q_com;
				this.clients = new Array();

				this.CommandInit();
				this.NetInit();
			},

			Frame: function () {
				this.NetFrame();
			},

			SpawnServer: function (map) {
				// TODO CHECK IF CLIENT IS RUNNING LOCAL SERVER, IF SO CONNECT THEM
				// TODO RE-CONNECT ALL CLIENTS AND HAVE THEM LOAD MAP
			}
		};
	};
});