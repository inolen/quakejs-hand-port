var sys;

var dedicated = false;
var events;
var frameTime;
var lastFrameTime;

function Init(sys_, dedicated_) {
	sys = sys_;
	dedicated = dedicated_;

	events = [];
	frameTime = lastFrameTime = sys.GetMilliseconds();

	sv.Init(sys, dedicated);

	if (!dedicated) {
		cl.Init(sys);

		// Provide the user a way to interface with the client.
		window.$ = function (str) {
			var args = Array.prototype.slice.call(arguments, 1);
			var callback;

			if ((callback = cmd.GetCmd(str))) {
				callback(args);
			}
		};
	}
}

function Frame() {
	lastFrameTime = frameTime;
	frameTime = sys.GetMilliseconds();

	var msec = frameTime - lastFrameTime;

	EventLoop();

	sv.Frame(frameTime, msec);

	if (!dedicated) {
		cl.Frame(frameTime, msec);
	}
}

function EventLoop() {
	var ev = events.shift();

	while (ev) {
		switch (ev.type) {
			case EventTypes.NETCONNECT:
				sv.ClientConnect(ev.addr, ev.socket);
				break;
			case EventTypes.NETDISCONNECT:
				sv.ClientDisconnect(ev.addr);
				break;
			case EventTypes.NETCLMESSAGE:
				cl.PacketEvent(ev.addr, ev.buffer);
				break;
			case EventTypes.NETSVMESSAGE:
				sv.PacketEvent(ev.addr, ev.buffer);
				break;
			case EventTypes.KEYDOWN:
				cl.KeyDownEvent(ev.time, ev.keyName);
				break;
			case EventTypes.KEYUP:
				cl.KeyUpEvent(ev.time, ev.keyName);
				break;
			case EventTypes.MOUSEMOVE:
				cl.MouseMoveEvent(ev.time, ev.deltaX, ev.deltaY);
				break;
		}

		ev = events.shift();
	}
};

function QueueEvent(ev) {
	ev.time = sys.GetMilliseconds();
	events.push(ev);
};