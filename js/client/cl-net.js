define('client/cl-net', ['common/com-defines', 'common/com-net'], function (q_com_def, q_com_net) {
	return function (q_r, q_bg) {
		var q_cl = this;

		function ProcessQueue() {
			// manually send packet events for the loopback channel
			var msg;
			/*while ((msg = q_com_net.GetLoopPacket(q_com_def.netsrc_t.NS_CLIENT))) {
				PacketEvent(msg);
			}*/
		}

		function PacketEvent(msg) {
			ParseServerPacket(msg);
		}

		function ParseServerPacket(msg) {
			console.log(msg);
		}

		return {
			NetInit: function () {
				q_cl.clc.netchan = q_com_net.CreateChannel(q_com_def.netsrc_t.NS_CLIENT, 'ws://localhost:9000', 0);
			},

			NetFrame: function () {
				ProcessQueue();
			}
		};
	};
});