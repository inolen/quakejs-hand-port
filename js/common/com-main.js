var events;
var frameTime;
var lastFrameTime;
var com_dedicated;

function Init(gl, viewport, viewportUi) {
	// Due to circular dependencies, we need to re-require sys now that we're all loaded.
	// http://requirejs.org/docs/api.html#circular
	sys = require('system/sys');

	events = [];
	frameTime = lastFrameTime = sys.GetMilliseconds();
	
	com_dedicated = CvarAdd('com_dedicated', 0);

	sv.Init();
	cl.Init(gl, viewport, viewportUi);

	// Provide the user a way to interface with the client.
	window.$ = function (cmd) {
		var args = Array.prototype.slice.call(arguments, 1);
		var callback;

		if ((callback = CmdGet(cmd))) {
			callback(args);
		}
	};
}

function Frame() {
	lastFrameTime = frameTime;
	frameTime = sys.GetMilliseconds();

	var msec = frameTime - lastFrameTime;

	EventLoop();

	sv.Frame(frameTime, msec);
	cl.Frame(frameTime, msec);
}

function EventLoop() {
	var ev = events.shift();

	while (ev) {
		switch (ev.type) {
			case sys.InputEventTypes.KEYDOWN:
				cl.KeyDownEvent(ev.time, ev.keyName);
				break;
			case sys.InputEventTypes.KEYUP:
				cl.KeyUpEvent(ev.time, ev.keyName);
				break;
			case sys.InputEventTypes.MOUSEMOVE:
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