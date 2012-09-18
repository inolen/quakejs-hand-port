define('client/cl-net', [], function () {
	return function (re, bg) {
		var cl = this;

		function ProcessQueue() {
			// manually send packet events for the loopback channel
			var msg;
			while ((msg = cl.clc.netchan.GetPacket())) {
				PacketEvent(msg);
			}
		}

		function PacketEvent(msg) {
			ParseServerPacket(msg);
		}

		function ParseServerPacket(msg) {
			console.log('cl received', msg);
		}

		return {
			NetInit: function () {
				cl.clc.netchan = cl.CreateChannel(cl.NetSrc.NS_CLIENT, 'ws://localhost:9000', 0);
			},

			NetFrame: function () {
				ProcessQueue();
			},

			NetSend: function (type, struct) {
				var buffer = new ArrayBuffer(1 + struct.byteLength);
				var view = new DataView(buffer, 0);

				view.setUint8(0, type, true);
				struct.serialize(buffer, 1);

				cl.clc.netchan.SendPacket(buffer);
			},

			//NetSendOOB: function (type, struct)
		};
	};
});