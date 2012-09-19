define('client/cl-cmd', [], function () {
	return function (re, bg) {
		var cl = this;

		function CmdInit() {
			cl.CmdAdd('connect', cl.CmdConnect);
		}

		function CmdConnect(serverName) {
			console.log('command connect: ' + serverName);
		}

		return {
			CmdInit: CmdInit,
			CmdConnect: CmdConnect
		};
	};
});