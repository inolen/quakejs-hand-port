define('client/cl-cmd', [], function () {
	return function (re, bg) {
		var cl = this;

		return {
			CommandInit: function () {
				cl.CommandAdd('connect', cl.CommandConnect);
			},

			/**
			 * Commands
			 */
			CommandConnect: function (serverName) {
				console.log('command connect: ' + serverName);
			}
		};
	};
});