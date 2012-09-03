define('sys/LoopbackChannel', [], function () {
	/**
	 * For a local server, don't actually send the packets over the WebSocket
	 */
	var MAX_PACKETLEN = 1400;
	// there needs to be enough loopback messages to hold a complete
	// gamestate of maximum size
	var MAX_LOOPBACK = 16;

	var loopmsg_t = {
		data: new Array(MAX_PACKETLEN),
		datalen: 0,
	};

	var LoopbackChannel = function (addr, challenge) {
		this.addr = addr;
		this.challenge = challenge;
		this.msgs = new Array(MAX_LOOPBACK);
		this.get = 0;
		this.send = 0;

		return {
			GetPacket: function () {
				if (this.send - this.get > MAX_LOOPBACK) {
					this.get = this.send - MAX_LOOPBACK;
				}

				if (this.get >= this.send) {
					return false;
				}

				var i = this.get & (MAX_LOOPBACK-1);
				this.get++;

				return {
					data: this.msgs[i].data,
					length: this.msgs[i].datalen
				};
			},

			SendPacket: function (data, length) {
				var i = this.send & (MAX_LOOPBACK-1);
				this.send++;

				this.msgs[i].data = data;
				this.msgs[i].datalen = length;
			}
		};
	};

	return LoopbackChannel;
});