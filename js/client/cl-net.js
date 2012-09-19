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
			cl.ParseServerPacket(msg);
		}

		function NetInit() {
			cl.NetConnect('localhost', 9000);
		}

		function NetFrame() {
			ProcessQueue();
		}

		function NetConnect(host, port) {
			cl.clc.netchan = cl.CreateChannel(cl.NetSrc.NS_CLIENT, 'ws://' + host + ':' + port, 0);
		}

		function NetSend(type, struct) {
			var buffer = new ArrayBuffer(1 + struct.byteLength);
			var view = new DataView(buffer, 0);

			view.setUint8(0, type, true);
			struct.serialize(buffer, 1);

			cl.clc.netchan.SendPacket(buffer);
		}

		return {
			NetInit: NetInit,
			NetFrame: NetFrame,
			NetConnect: NetConnect,
			NetSend: NetSend
		};
	};
});