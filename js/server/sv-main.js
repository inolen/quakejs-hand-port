define('server/sv-main', [], function () {
	return function (q_bg) {
		return {
			Init: function () {
				this.clients = new Array();

				this.NetInit();
			},

			Frame: function () {
				//
				this.NetFrame();
			}
		};
	};
});