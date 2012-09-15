define('common/com-net', ['common/com-defines', 'sys/LoopbackChannel', 'sys/WebSocketClientChannel'], function (q_com_def, LoopbackChannel, WebSocketClientChannel) {
	return function () {
		var loopback;

		function StringToAddr(str) {
			var addr = Object.create(q_com_def.netadr_t);

			if (str.indexOf('localhost') !== -1) {
				addr.type = q_com_def.netadrtype_t.NA_LOOPBACK;
			} else {
				addr.type = q_com_def.netadrtype_t.NA_IP;
			}

			// TODO: Add a default port support.
			var ip = str;
			var m = ip.match(/\/\/(.+)\:(\d+)/);
			if (m) {
				addr.ip = m[1];
				addr.port = m[2];
			}

			return addr;
		}

		return {
			CreateChannel: function (sock, addrstr, challenge) {
				var addr = StringToAddr(addrstr);

				if (addr.type === q_com_def.netadrtype_t.NA_LOOPBACK) {
					if (!loopback) {
						loopback = new LoopbackChannel(sock, challenge);
					}

					return sock === q_com_def.netsrc_t.NS_CLIENT ?
						loopback.Client :
						loopback.Server;
				} else {
					return new WebSocketClientChannel(addr, challenge);
				}
			}
		};
	};
});