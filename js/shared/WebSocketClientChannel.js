// TODO: We need to use a node.js specific lib on the server so we can accept connections.
define('system/WebSocketClientChannel', [], function () {
	var WebSocketClientChannel = function (addr, challenge, callback) {
		var self = this;

		this.addr = addr;
		this.challenge = challenge;

		// Create websocket.
		this.ws = new WebSocket('ws://' + channel.addr.ip + ':' + channel.addr.port, ['q3js']);
		this.ws.binaryType = 'arraybuffer';
		this.ws.onopen = function () {
			self.emitEvent('open');
		};
		this.ws.onerror = function (error) {
		};
	};

	WebSocketClientChannel.prototype.GetPacket = function () {
	};

	WebSocketClientChannel.prototype.SendPacket = function (arraybuffer) {
		this.ws.send(arraybuffer);
	};

	_.extend(WebSocketClientChannel.prototype, EventEmitter.prototype);

	return WebSocketClientChannel;
});