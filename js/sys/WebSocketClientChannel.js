define('sys/WebSocketClientChannel', [], function () {
	var WebSocketClientChannel = function (addr, challenge) {
		this.addr = addr;
		this.challenge = challenge;

		var ws = this.ws = new WebSocket('ws://' + channel.addr.ip + ':' + channel.addr.port, ['q3js']);

		ws.onopen = function () {
			channel.ws.send('Ping'); // Send the message 'Ping' to the server
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

			SendPacket: function (data, length) {
			}
		};
	};

	return WebSocketClientChannel;
});