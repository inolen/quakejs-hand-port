var sys;

var dedicated = false;
var events;
var frameTime;
var lastFrameTime;

/**
 * Init
 */
function Init(sysinterface, isdedicated) {
	sys = sysinterface;
	dedicated = isdedicated;
	events = [];
	frameTime = lastFrameTime = sys.GetMilliseconds();

	InitCmds();
	
	var exports = {
		SaveConfig:     SaveConfig,
		AddCvar:        AddCvar,
		GetCvar:        GetCvar,
		SetCvar:        SetCvar,
		AddCmd:         AddCmd,
		GetCmd:         GetCmd,
		ExecuteCmdText: ExecuteCmdText,
		NetchanSetup:   NetchanSetup,
		NetchanDestroy: NetchanDestroy,
		NetchanSend:    NetchanSend,
		NetchanPrint:   NetchanPrint,
		NetchanProcess: NetchanProcess
	};

	sv.Init(sys, exports, dedicated);

	if (!dedicated) {
		cl.Init(sys, exports);

		// Provide the user a way to interface with the client.
		/*window.$ = function (str) {
			ExecuteCmdText(str);
		};*/
	}

	LoadConfig();
}

/**
 * Frame
 */
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

/**
 * EventLoop
 */
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

/**
 * QueueEvent
 */
function QueueEvent(ev) {
	ev.time = sys.GetMilliseconds();
	events.push(ev);
};

/**
 * LoadConfig
 */
function LoadConfig() {
	ExecuteCmdText('exec default.cfg');
}

/**
 * SaveConfig
 */
function SaveConfig() {
	var cfg = 'unbindall\n';

	cfg = cl.WriteBindings(cfg);
	cfg = WriteCvars(cfg);

	sys.WriteFile('default.cfg', cfg, 'utf8', function (err) {
		if (!err) {
			console.log('SHIT WAS SAVED');
		}
	});
}