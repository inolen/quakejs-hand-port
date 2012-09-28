/**
 * For a local server, don't actually send the packets over the WebSocket.
 * This thing is a complete piece of shit currently, but it kind of works.
 */
define('shared/LoopbackChannel', [], function () {
	var MAX_PACKETLEN = 1400;
	// there needs to be enough loopback messages to hold a complete
	// gamestate of maximum size
	var MAX_LOOPBACK = 16;

	var LoopbackChannel = function (sock, addr, challenge) {
		this.queue = {
			msgs: new Array(MAX_LOOPBACK),
			get: 0,
			send: 0
		};
		this.sock = sock;
		this.addr = addr;
		this.challenge = challenge;

		// Trigger some fake events as if we're a real socket.
		// Wait 1 frame so the consumer has time to bind.
		if (!sock) {
			LoopbackChannel.Client = this;
			setTimeout(function () {
				LoopbackChannel.Client.emitEvent('open');
				LoopbackChannel.Server.emitEvent('accept', [LoopbackChannel.Client]);
			}, 0);
		} else {
			LoopbackChannel.Server = this;
			setTimeout(function () {
				LoopbackChannel.Server.emitEvent('open');
			}, 0);
		}
	};

	LoopbackChannel.prototype.GetPacket = function () {
		var chan = !this.sock ? LoopbackChannel.Client : LoopbackChannel.Server;
		var q = chan.queue;

		if (q.send - q.get > MAX_LOOPBACK) {
			q.get = q.send - MAX_LOOPBACK;
		}

		if (q.get >= q.send) {
			return null;
		}

		var i = q.get & (MAX_LOOPBACK-1);
		q.get++;

		return {
			addr: chan.addr,
			buffer: q.msgs[i].buffer,
			length: q.msgs[i].length
		};
	};

	LoopbackChannel.prototype.SendPacket = function (buffer, length) {
		var q = !this.sock ? LoopbackChannel.Server.queue : LoopbackChannel.Client.queue;

		var i = q.send & (MAX_LOOPBACK-1);
		q.send++;
		q.msgs[i] = {
			buffer: buffer,
			length: length
		};
	};

	LoopbackChannel.prototype.Close = function () {
		if (!this.sock) {
			LoopbackChannel.Server.emitEvent('close', [LoopbackChannel.Client]);
			LoopbackChannel.Client = null;
		} else {
			LoopbackChannel.Client.emitEvent('close');
			LoopbackChannel.Server = null;
		}
	};

	_.extend(LoopbackChannel.prototype, EventEmitter.prototype);

	return LoopbackChannel;
});