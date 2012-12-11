var sys,
	sv,
	cl;

var dedicated,
	events,
	frameTime,
	lastFrameTime,
	initialized,
	configsLoaded;

/**
 * log
 */
function log() {
	var args = Array.prototype.slice.call(arguments);
	args.splice(0, 0, 'COM:');
	Function.apply.call(console.log, console, args);
}

/**
 * error
 */
function error(level, str) {
	if (level === ERR.DISCONNECT) {
		console.error('Server disconnected');
		sv.Shutdown();
		cl.Disconnect();
	}
	if (level === ERR.DROP) {
		console.error('Server crashed:', str);
		sv.Shutdown();
		cl.Disconnect();
	}

	// Exit the current frame.
	throw new Error();
}

/**
 * Init
 */
function Init(sysInstance, isDedicated) {
	sys = sysInstance;
	cl  = cl_mod.CreateInstance(GetExports());
	sv  = sv_mod.CreateInstance(GetExports());

	dedicated = isDedicated;
	events = [];
	frameTime = lastFrameTime = sys.GetMilliseconds();
	initialized = false;
	configsLoaded = false;

	RegisterCvars();
	RegisterCommands();

	if (!dedicated) {
		cl.Init();
	}

	sv.Init(cl, dedicated);

	// Load the default config files (after the base set
	// and bind commands have been added from com and cl).
	LoadConfig();
	
	initialized = true;
}

/**
 * Frame
 */
function Frame() {
	lastFrameTime = frameTime;
	frameTime = sys.GetMilliseconds();

	var msec = frameTime - lastFrameTime;

	CheckSaveConfig();
	EventLoop();

	sv.Frame(msec);
	if (!dedicated) {
		cl.Frame(msec);
	}
}

/**
 * EventLoop
 */
function EventLoop() {
	var ev = events.shift();

	while (ev) {
		switch (ev.type) {
			case SE.CLMSG:
				cl.PacketEvent(ev.buffer);
				break;
			case SE.SVMSG:
				sv.PacketEvent(ev.socket, ev.buffer);
				break;
			case SE.NETSVSOCKCLOSE:
				sv.SocketClosed(ev.socket);
				break;
			case SE.KEY:
				if (ev.pressed) {
					cl.KeyDownEvent(ev.time, ev.keyName);
				} else {
					cl.KeyUpEvent(ev.time, ev.keyName);
				}
				break;
			case SE.MOUSE:
				cl.MouseMoveEvent(ev.time, ev.deltaX, ev.deltaY);
				break;
		}

		ev = events.shift();
	}
}

/**
 * QueueEvent
 */
function QueueEvent(ev) {
	ev.time = sys.GetMilliseconds();
	events.push(ev);
}

/**
 * ExecuteBuffer
 */
// This regex will split space delimited strings,
// honoring quotation mark groups.
var argsRegex = /([^"\s]+)|"([^"]+)"/g;
function ExecuteBuffer(buffer) {
	var args = [];
	var m;
	while ((m = argsRegex.exec(buffer))) {
		args.push(m[1] || m[2]);
	}

	var cmdcb = GetCmd(args[0]);
	if (cmdcb) {
		cmdcb.apply(this, args.slice(1));
		return;
	}
}

/**
 * CheckSaveConfig
 */
function CheckSaveConfig() {
	// Don't save anything until we're fully initialized.
	if (!initialized || !configsLoaded) {
		return;
	}

	// Only save if we've modified an archive cvar.
	if (!(cvarModifiedFlags & CVF.ARCHIVE)) {
		return;
	}

	cvarModifiedFlags &= ~CVF.ARCHIVE;

	SaveConfig();
} 

/**
 * LoadConfig
 */
function LoadConfig() {
	CmdExec('default.cfg', function () {
		CmdExec('q3config.cfg', function () {
			configsLoaded = true;

			// If any archived cvars are modified after this, we will trigger a
			// writing of the config file.
			cvarModifiedFlags &= ~CVF.ARCHIVE;
		});
	});
}

/**
 * SaveConfig
 */
function SaveConfig(callback) {
	var filename = 'q3config.cfg';

	var cfg = 'unbindall\n';
	cfg = cl.WriteBindings(cfg);
	cfg = WriteCvars(cfg);

	console.log('Saving config to', filename);

	sys.WriteFile(filename, cfg, 'utf8', callback);
}

/**
 * GetExports
 */
function GetExports() {
	var exports = {
		com: {
			MAX_MAP_AREA_BYTES:    MAX_MAP_AREA_BYTES,
			PACKET_BACKUP:         PACKET_BACKUP,
			MAX_PACKET_USERCMDS:   MAX_PACKET_USERCMDS,
			MAX_RELIABLE_COMMANDS: MAX_RELIABLE_COMMANDS,
			MAX_MSGLEN:            MAX_MSGLEN,
			ERR:                   ERR,
			CLM:                   CLM,
			SVM:                   SVM,
			Error:                 error,
			ExecuteBuffer:         ExecuteBuffer,
			LoadConfig:            LoadConfig,
			SaveConfig:            SaveConfig,
			AddCvar:               AddCvar,
			GetCvarVal:            GetCvarVal,
			SetCvarVal:            SetCvarVal,
			RelatchCvar:           RelatchCvar,
			GetCvarValues:         GetCvarValues,
			AddCmd:                AddCmd,
			GetCmd:                GetCmd,
			NetchanSetup:          NetchanSetup,
			NetchanDestroy:        NetchanDestroy,
			NetchanSend:           NetchanSend,
			NetchanPrint:          NetchanPrint,
			NetchanProcess:        NetchanProcess
		},
		sys: sys  // Export all of sys
	};

	Object.defineProperty(exports.com, 'frameTime', {
		get: function () { return frameTime; }
	});

	Object.defineProperty(exports.com, 'cvarModifiedFlags', {
		get: function () { return cvarModifiedFlags; },
		set: function (val) { cvarModifiedFlags = val; }
	});

	return exports;
}