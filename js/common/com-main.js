var frameTime;
var lastFrameTime;
var com_dedicated;

function Init(gl, viewport, viewportUi) {
	// Due to circular dependencies, we need to re-require sys now that we're all loaded.
	// http://requirejs.org/docs/api.html#circular
	sys = require('system/sys');

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

function GetMsec() {
	lastFrameTime = frameTime;
	frameTime = sys.GetMilliseconds();
	return frameTime - lastFrameTime;
}

function Frame() {
	var msec = GetMsec();
	sv.Frame(frameTime, msec);
	cl.Frame(frameTime, msec);
}

/*function EventLoop() {
	var ev = _events.shift();

	while (ev) {
		var handler = _eventHandlers[ev.type];

		if (!handler) {
			console.error("Could not find handler for event " + ev.type);
			continue;
		}

		handler.call(this, ev);

		ev = _events.shift();
	}
};

function QueueEvent(ev) {
	ev.time = Date().now;
	_events.push(ev);
};*/