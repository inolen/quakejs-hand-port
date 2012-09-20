define('sys/WebSocketClientChannel', [], function () {
	var WebSocketClientChannel = function (addr, challenge) {
		this.addr = addr;
		this.challenge = challenge;

		var ws = this.ws = new WebSocket('ws://' + channel.addr.ip + ':' + channel.addr.port, ['q3js']);
	
		ws.binaryType = 'arraybuffer';
		ws.onopen = function () {
		};
		ws.onerror = function (error) {
			console.log('WebSocket Error ' + error);
		};
		ws.onmessage = function (e) {
			console.log('Server: ' + e.data);
		};

		return {
			GetPacket: function () {
			},

			SendPacket: function (arraybuffer) {
				channel.ws.send(arraybuffer);
			}
		};
	};

	return WebSocketClientChannel;
});