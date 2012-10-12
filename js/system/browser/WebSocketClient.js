define('system/browser/WebSocketClient',
['underscore', 'EventEmitter'],
function (_, EventEmitter) {
	var WebSocketClient = function (addr, callback) {
		var self = this;

		this.addr = addr;
		this.packets = new Array();

		// Create websocket.
		this.ws = new WebSocket('ws://' + addr.ip + ':' + addr.port, ['q3js']);
		this.ws.binaryType = 'arraybuffer';
		this.ws.onopen = function () {
			self.emitEvent('open');
		};
		this.ws.onmessage = function (event) {
			self.packets.push({
				addr: addr,
				buffer: event.data,
				length: event.data.byteLength
			});
		};
		this.ws.onerror = function (error) {
		};
	};

	WebSocketClient.prototype.GetPacket = function () {
		return this.packets.shift();
	};

	WebSocketClient.prototype.SendPacket = function (buffer, length) {
		if (this.ws.readyState !== 1) return;

		this.ws.send(buffer);
	};

	_.extend(WebSocketClient.prototype, EventEmitter.prototype);

	return WebSocketClient;
});