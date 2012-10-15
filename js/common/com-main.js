var sys;

var dedicated = false;
var events;
var frameTime;
var lastFrameTime;

function Init(sysinterface, isdedicated) {
	sys = sysinterface;
	dedicated = isdedicated;
	events = [];
	frameTime = lastFrameTime = sys.GetMilliseconds();

	var cominterface = {
		AddCvar:              AddCvar,
		GetCvar:              GetCvar,
		SetCvar:              SetCvar,
		AddCmd:               AddCmd,
		GetCmd:               GetCmd,
		NetchanSetup:         NetchanSetup,
		NetchanDestroy:       NetchanDestroy,
		NetchanSend:          NetchanSend,
		NetchanPrint:         NetchanPrint,
		NetchanProcess:       NetchanProcess,
		GetMilliseconds:      sys.GetMilliseconds,
		ReadFile:             sys.ReadFile,
		GetGameRenderContext: sys.GetGameRenderContext,
		GetUIRenderContext:   sys.GetUIRenderContext,
		NetCreateServer:      sys.NetCreateServer,
		NetConnectToServer:   sys.NetConnectToServer,
		NetSend:              sys.NetSend,
		NetClose:             sys.NetClose
	};

	sv.Init(cominterface, dedicated);

	if (!dedicated) {
		cl.Init(cominterface);

		// Provide the user a way to interface with the client.
		window.$ = function (str) {
			var split = str.split(' ');
			var cmdstr = split[0];
			var args = split.slice(1);
			var callback;

			if ((callback = GetCmd(cmdstr))) {
				callback.apply(this, args);
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
			case EventTypes.NETCLMESSAGE:
				cl.PacketEvent(ev.addr, ev.buffer);
				break;
			case EventTypes.NETSVCONNECT:
				sv.ClientConnect(ev.addr, ev.socket);
				break;
			case EventTypes.NETSVDISCONNECT:
				//sv.ClientDisconnect(ev.addr);
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