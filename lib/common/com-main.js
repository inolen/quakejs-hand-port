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
function error(str) {
	log(str);

	if (cl) {
		cl.Disconnect();
	}
	sv.Kill();

	sys.Error(str, false);
}

/**
 * Init
 */
function Init(inSys, inDedicated) {
	sys = inSys;
	sv  = Server.CreateInstance(GetExports());

	dedicated = inDedicated;
	events = [];
	frameTime = lastFrameTime = sys.GetMilliseconds();
	initialized = false;
	configsLoaded = false;

	RegisterCommands();

	if (!dedicated) {
		cl = Client.CreateInstance(GetExports());
		cl.Init(sv);
		sv.Init(cl);
	} else {
		sv.Init(null);
	}

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
	ev.time = sys.GetMilliseconds();
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
	// Don't save anything until we're fully initialized.
	if (!initialized || !configsLoaded) {
		return;
	}

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
function LoadConfig() {
	CmdExec('default.cfg', function () {
		CmdExec('q3config.cfg', function () {
			configsLoaded = true;

			// If any archived cvars are modified after this, we will trigger a
			// writing of the config file.
			Cvar.ClearModified(QS.CVAR.ARCHIVE);
		});
	});
}

/**
 * SaveConfig
 */
function SaveConfig(callback) {
	var filename = 'q3config.cfg';

	var cfg = '';
	cfg = WriteCvars(cfg);
	if (cl) {
		cfg = cl.WriteBindings(cfg);
	}

	console.log('Saving config to', filename);

	sys.WriteFile(filename, cfg, 'utf8', callback);
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
		com: {
			MAX_MAP_AREA_BYTES:    MAX_MAP_AREA_BYTES,
			PACKET_BACKUP:         PACKET_BACKUP,
			MAX_PACKET_USERCMDS:   MAX_PACKET_USERCMDS,
			MAX_RELIABLE_COMMANDS: MAX_RELIABLE_COMMANDS,
			MAX_MSGLEN:            MAX_MSGLEN,
			CLM:                   CLM,
			SVM:                   SVM,
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
		},
		sys: sys  // Export all of sys
	};

	Object.defineProperty(exports.com, 'frameTime', {
		get: function () { return frameTime; }
	});

	return exports;
}
