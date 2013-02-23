var SYS,
	CL,
	SV;

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

	if (CL) {
		CL.Disconnect();
	}
	SV.Kill();

	SYS.Error(str);
}

/**
 * Init
 */
function Init(inSYS, inDedicated, callback) {
	SYS = inSYS;
	if (!inDedicated) {
		CL = new Client(GetExports());
	}
	SV = new Server(GetExports());

	dedicated = inDedicated;
	events = [];
	frameTime = lastFrameTime = SYS.GetMilliseconds();
	initialized = false;

	RegisterCommands();

	// Register bind commands early to support LoadConfig.
	if (CL) {
		CL.RegisterKeyCommands();
	}

	// Load config and then client / server modules.
	async.waterfall([
		function (cb) {
			LoadConfig(cb);
		},
		function (cb) {
			if (!CL) {
				return cb();
			}

			CL.Init(SV, cb);
		},
		function (cb) {
			SV.Init(CL, cb);
		}
	], function (err) {
		if (err) {
			error(err.message);
			return;
		}

		initialized = true;
		callback(null);
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

	SV.Frame(msec);

	if (CL) {
		CL.Frame(msec);
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
					CL.KeyDownEvent(ev.time, ev.keyName);
				} else {
					CL.KeyUpEvent(ev.time, ev.keyName);
				}
				break;
			case SE.MOUSE:
				CL.MouseMoveEvent(ev.time, ev.deltaX, ev.deltaY);
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

// Splits by non-quotes semicolons.
var splitRegex = /(?:\"[^\"]*\"|[^;])+/g;

// This regex will split space delimited strings,
// honoring quotation mark groups.
var argsRegex = /([^"\s]+)|"((?:\\"|[^"])+)"/g;

function ExecuteBuffer(buffer) {
	// Split buffer by non-quoted semicolons.
	var matches = buffer.match(splitRegex);

	if (!matches) {
		log('Failed to parse buffer.');
		return;
	}

	matches.forEach(function (buffer) {
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
			CL.ForwardCommandToServer(args);
			return;
		}

		log('Unknown command \'' + args[0] + '\'');
	});
}

/**
 * CheckSaveConfig
 */
function CheckSaveConfig() {
	// Only save if we've modified an archive cvar.
	if (!Cvar.Modified(Cvar.FLAGS.ARCHIVE) && !(CL && CL.BindsModified())) {
		return;
	}

	Cvar.ClearModified(Cvar.FLAGS.ARCHIVE);
	if (CL) {
		CL.ClearBindsModified();
	}

	SaveConfig();
}

/**
 * LoadConfig
 */
function LoadConfig(callback) {
	CmdExec('user.cfg', function () {
		// If any archived cvars are modified after this, we will trigger a
		// writing of the config file.
		Cvar.ClearModified(Cvar.FLAGS.ARCHIVE);

		callback(null);
	});
}

/**
 * SaveConfig
 */
function SaveConfig() {
	var filename = 'user.cfg';

	log('Saving config to', filename);

	var cfg = '';
	cfg = WriteCvars(cfg);
	if (CL) {
		cfg = CL.WriteBindings(cfg);
	}

	SYS.WriteFile(filename, cfg, 'utf8', function () {});
}

/**
 * WriteCvars
 */
function WriteCvars(str) {
	var cvars = Cvar.GetCvarJSON(Cvar.FLAGS.ARCHIVE);

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
