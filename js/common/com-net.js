define('common/com-net', ['common/com-defines', 'sys/LoopbackChannel', 'sys/WebSocketChannel'], function (q_com_def, LoopbackChannel, WebSocketChannel) {
	function GetPacket() {
	}

	function QueuePacket() {
	}

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
				return new LoopbackChannel(addr, challenge);
			} else {
				return new WebSocketChannel(addr, challenge);
			}
		},

		Transmit: function (channel, data, length) {
			channel.SendPacket(channel, data, length);
		},

		Process: function () {
			channel.GetPacket();
		}
	};
});