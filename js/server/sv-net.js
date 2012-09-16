define('server/sv-net', [], function () {
	return function (bg) {
		var sv = this;
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

			if (type === sv.clc_ops_e.clc_move) {
				struct = sv.usercmd_t.deserialize(buffer, 0, 1)[0];
			}

			//console.log('sv received: ' + type, struct);
		}

		function ParseClientMessage(msg) {
		}

		return {
			NetInit: function () {
				channel = sv.CreateChannel(sv.netsrc_t.NS_SERVER, 'ws://localhost:9000', 0);
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