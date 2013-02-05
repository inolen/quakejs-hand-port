var SYS;

var sv,
	cl;

var dedicated,
	events,
	frameTime,
	lastFrameTime,
	initialized;

/**
 * log
 */
function log() {
	Function.apply.call(console.log, console, arguments);
}

/**
 * error
 */
function error(str) {
	log(str);

	if (cl) {
		cl.Disconnect();
	}
	sv.Kill();

	SYS.Error(str, false);
}

/**
 * Init
 */
function Init(inSYS, inDedicated, callback) {
	SYS = inSYS;
	sv  = Server.CreateInstance(GetExports());

	dedicated = inDedicated;
	events = [];
	frameTime = lastFrameTime = SYS.GetMilliseconds();
	initialized = false;

	RegisterCommands();

	if (!dedicated) {
		cl = Client.CreateInstance(GetExports());

		// Register client commands early so bind exists for LoadConfig.
		cl.RegisterKeyCommands();
	}

	LoadConfig(function () {
		if (cl) {
			cl.Init(sv);
		}

		sv.Init(cl);

		initialized = true;

		callback();
	});
}

/**
 * Frame
 */
function Frame() {
	lastFrameTime = frameTime;
	frameTime = SYS.GetMilliseconds();

	if (!initialized) {
		return;
	}

	var msec = frameTime - lastFrameTime;

	CheckSaveConfig();
	EventLoop();

	sv.Frame(msec);
	if (cl) {
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
	ev.time = SYS.GetMilliseconds();
	events.push(ev);
}

/**
 * ExecuteBuffer
 */
// This regex will split space delimited strings,
// honoring quotation mark groups.
var argsRegex = /([^"\s]+)|"((?:\\"|[^"])+)"/g;
function ExecuteBuffer(buffer) {
	var args = [];
	var m;
	while ((m = argsRegex.exec(buffer))) {
		var val = m[1] || m[2];

		// Unescape quotes.
		val = val.replace(/\\"/g, '"');

		args.push(val);
	}

	// Try to look up the cmd in the registered cmds.
	var cmdcb = GetCmd(args[0]);
	if (cmdcb) {
		cmdcb.apply(this, args.slice(1));
		return;
	}
	// If cb is explicitly null, forward this command to the server.
	else if (cmdcb === null) {
		cl.ForwardCommandToServer(args);
		return;
	}

	log('Unknown command \'' + args[0] + '\'');
}

/**
 * CheckSaveConfig
 */
function CheckSaveConfig() {
	// Only save if we've modified an archive cvar.
	if (!Cvar.Modified(QS.CVAR.ARCHIVE) && !(cl && cl.BindsModified())) {
		return;
	}

	Cvar.ClearModified(QS.CVAR.ARCHIVE);
	if (cl) {
		cl.ClearBindsModified();
	}

	SaveConfig();
}

/**
 * LoadConfig
 */
function LoadConfig(callback) {
	CmdExec('default.cfg', function () {
		CmdExec('user.cfg', function () {
			// If any archived cvars are modified after this, we will trigger a
			// writing of the config file.
			Cvar.ClearModified(QS.CVAR.ARCHIVE);

			callback();
		});
	});
}

/**
 * SaveConfig
 */
function SaveConfig() {
	var filename = 'user.cfg';

	var cfg = '';
	cfg = WriteCvars(cfg);
	if (cl) {
		cfg = cl.WriteBindings(cfg);
	}

	SYS.WriteFile(filename, cfg, 'utf8', function () {});
}

/**
 * WriteCvars
 */
function WriteCvars(str) {
	var cvars = Cvar.GetCvarJSON(QS.CVAR.ARCHIVE);

	for (var name in cvars) {
		if (!cvars.hasOwnProperty(name)) {
			continue;
		}

		str += 'set ' + name + ' ' + cvars[name] + '\n';
	}

	return str;
}

/**
 * GetExports
 */
function GetExports() {
	var exports = {
		SYS: SYS,
		COM: {
			MAX_MAP_AREA_BYTES:    MAX_MAP_AREA_BYTES,
			PACKET_BACKUP:         PACKET_BACKUP,
			MAX_PACKET_USERCMDS:   MAX_PACKET_USERCMDS,
			MAX_RELIABLE_COMMANDS: MAX_RELIABLE_COMMANDS,
			MAX_MSGLEN:            MAX_MSGLEN,
			CLM:                   CLM,
			SVM:                   SVM,
			Log:                   log,
			Error:                 error,
			ExecuteBuffer:         ExecuteBuffer,
			LoadConfig:            LoadConfig,
			SaveConfig:            SaveConfig,
			AddCmd:                AddCmd,
			GetCmd:                GetCmd,
			WriteDeltaUsercmd:     WriteDeltaUsercmd,
			ReadDeltaUsercmd:      ReadDeltaUsercmd,
			WriteDeltaPlayerState: WriteDeltaPlayerState,
			ReadDeltaPlayerState:  ReadDeltaPlayerState,
			WriteDeltaEntityState: WriteDeltaEntityState,
			ReadDeltaEntityState:  ReadDeltaEntityState,
			NetchanSetup:          NetchanSetup,
			NetchanDestroy:        NetchanDestroy,
			NetchanSend:           NetchanSend,
			NetchanPrint:          NetchanPrint,
			NetchanProcess:        NetchanProcess,
			StringToAddr:          StringToAddr,
			LoadBsp:               LoadBsp
		}
	};

	Object.defineProperty(exports.COM, 'frameTime', {
		get: function () { return frameTime; }
	});

	return exports;
}
