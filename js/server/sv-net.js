define('server/sv-net', ['common/com-defines', 'common/com-net'], function (q_com_def, q_com_net) {
	return function (q_bg) {
		var q_sv = this;
		var channel;

		function ProcessQueue() {
			// manually send packet events for the loopback channel
			var msg;
			while ((msg = channel.GetPacket())) {
				PacketEvent(msg);
			}
		}

		function PacketEvent(msg) {
			var buffer = msg.data;
			var view = new DataView(buffer, 0);

			var type = view.getUint8(0, true);
			var struct = null;

			if (type === q_com_def.clc_ops_e.clc_move) {
				struct = q_com_def.usercmd_t.deserialize(buffer, 0, 1)[0];
			}

			//console.log('sv received: ' + type, struct);
		}

		function ParseClientMessage(msg) {
		}

		return {
			NetInit: function () {
				channel = q_com_net.CreateChannel(q_com_def.netsrc_t.NS_SERVER, 'ws://localhost:9000', 0);
			},

			NetFrame: function () {
				ProcessQueue();
			},

			NetSend: function (data, length) {
				channel.SendPacket(data, length);
			}
		};
	};
});