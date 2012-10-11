/**
 * For a local server, don't actually send the packets over the WebSocket.
 * This thing is a complete piece of shit currently, but it kind of works.
 */
define('system/browser/LoopbackSocket', [], function () {
	var MAX_PACKETLEN = 1400;
	var MAX_LOOPBACK  = 16;
	var CLIENT = 0;
	var SERVER = 1;

	var queues = [
		{ msgs: new Array(MAX_LOOPBACK), get: 0, send: 0 },
		{ msgs: new Array(MAX_LOOPBACK), get: 0, send: 0 },
	];
	var addr = { type: 1 };

	function GetPacket(src) {
		var q = queues[src];

		if (q.send - q.get > MAX_LOOPBACK) {
			q.get = q.send - MAX_LOOPBACK;
		}

		if (q.get >= q.send) {
			return null;
		}

		var i = q.get & (MAX_LOOPBACK-1);
		q.get++;

		return {
			addr: addr,
			buffer: q.msgs[i].buffer,
			length: q.msgs[i].length
		};
	};

	function SendPacket(src, buffer, length) {
		var q = queues[src^1];

		var i = q.send & (MAX_LOOPBACK-1);
		q.send++;
		q.msgs[i] = {
			buffer: buffer,
			length: length
		};
	};

	var LoopbackClientSocket = {
		SendPacket: function (buffer, length) {
			SendPacket(CLIENT, buffer, length);
		},
		GetPacket: function () {
			return GetPacket(CLIENT);
		},
		Close: function () {
			LoopbackServerSocket.emitEvent('close', [addr]);
		}
	};
	_.extend(LoopbackClientSocket, EventEmitter.prototype);

	var LoopbackServerSocket = {
		SendPacket: function (buffer, length) {
			SendPacket(SERVER, buffer, length);
		},
		GetPacket: function () {
			return GetPacket(SERVER);
		},
		Close: function () {
			LoopbackServerSocket.emitEvent('close', [addr]);
		}
	};
	_.extend(LoopbackServerSocket, EventEmitter.prototype);

	return {
		ConnectToClient: function () {
			setTimeout(function () {
				LoopbackServerSocket.emitEvent('open');
			}, 0);

			return LoopbackServerSocket;
		},
		ConnectToServer: function (challenge) {
			setTimeout(function () {
				LoopbackClientSocket.emitEvent('open');
				LoopbackServerSocket.emitEvent('accept', [addr, LoopbackServerSocket]);
			}, 0);

			return LoopbackClientSocket;
		}
	}
});