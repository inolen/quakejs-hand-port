define('sys/LoopbackChannel', [], function () {
	/**
	 * For a local server, don't actually send the packets over the WebSocket
	 */
	var MAX_PACKETLEN = 1400;
	// there needs to be enough loopback messages to hold a complete
	// gamestate of maximum size
	var MAX_LOOPBACK = 16;

	var queue_t = {
		msgs: new Array(MAX_LOOPBACK),
		get: 0,
		send: 0
	};

	var LoopbackChannel = function (challenge) {
		var queues = new Array(2);
		queues[0] = Object.create(queue_t);
		queues[1] = Object.create(queue_t);

		var _channel = function (sock) {
			return {
				GetPacket: function () {
					var q = queues[sock];

					if (q.send - q.get > MAX_LOOPBACK) {
						q.get = q.send - MAX_LOOPBACK;
					}

					if (q.get >= q.send) {
						return null;
					}

					var i = q.get & (MAX_LOOPBACK-1);
					q.get++;

					return q.msgs[i];
				},

				SendPacket: function (data) {
					var q = queues[sock^1];
					var i = q.send & (MAX_LOOPBACK-1);
					q.send++;
					q.msgs[i] = { data: data };
				}
			};
		};

		return {
			Client: new _channel(0),
			Server: new _channel(1)
		};
	};

	return LoopbackChannel;
});