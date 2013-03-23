var SYS,
	CL,
	SV;

var com_filecdn,
	com_protocol,
	com_speeds;

var dedicated,
	events,
	frameTime,
	lastFrameTime,
	frameNumber,
	logCallback,
	initialized;

/**
 * log
 */
function log() {
	if (logCallback) {
		logCallback.apply(this, arguments);
		return;
	}

	if (CL) {
		var str = Array.prototype.join.call(arguments, ' ');
		CL.PrintConsole(str);
	}

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
 * BeginRedirect
 */
function BeginRedirect(callback) {
	logCallback = callback;
}

/**
 * EndRedirect
 */
function EndRedirect() {
	logCallback = null;
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
	frameNumber = 0;
	initialized = false;

	RegisterCvars();
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
			// Go ahead and execute any cvars from the startup commands.
			ExecuteStartupCommands(true, cb);
		},
		function (cb) {
			if (!CL) {
				return cb();
			}

			CL.Init(SV, cb);
		},
		function (cb) {
			SV.Init(CL, cb);
		},
		function (cb) {
			// Wait until after CL / SV have initialized to run commands.
			ExecuteStartupCommands(false, cb);
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
 * RegisterCvars
 */
function RegisterCvars() {
	// TODO Enable servers to override, or append a fallback to this,
	// to provide custom maps / mods to clients.
	com_filecdn  = Cvar.AddCvar('com_filecdn', 'http://content.quakejs.com',  Cvar.FLAGS.ARCHIVE);
	com_protocol = Cvar.AddCvar('com_protocol', QS.PROTOCOL_VERSION,          Cvar.FLAGS.ROM);
	com_speeds   = Cvar.AddCvar('com_speeds',   0);
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
	var timeBeforeEvents, timeBeforeServer, timeBeforeClient, timeAfter;

	CheckSaveConfig();

	timeBeforeEvents = SYS.GetMilliseconds();

	EventLoop();

	timeBeforeServer = SYS.GetMilliseconds();

	SV.Frame(msec);

	timeBeforeClient = SYS.GetMilliseconds();

	if (CL) {
		CL.Frame(msec);
	}

	timeAfter = SYS.GetMilliseconds();

	// Report timing information.
	if (com_speeds.get()) {
		var all, ev, sv, cl;

		all = timeAfter - timeBeforeEvents;
		sv = timeBeforeClient- timeBeforeServer;
		ev = timeBeforeServer - timeBeforeEvents;
		cl = timeAfter - timeBeforeClient;

		log('frame:', frameNumber++, 'all:', all, 'ev:', ev, 'sv:', sv, 'cl:', cl);
	}
}

/**
 * EventLoop
 */
function EventLoop() {
	var ev = events.shift();

	while (ev) {
		switch (ev.type) {
			case SE.KEYDOWN:
				CL.KeyDownEvent(ev.data);
				break;

			case SE.KEYUP:
				CL.KeyUpEvent(ev.data);
				break;

			case SE.CHAR:
				CL.KeyPressEvent(ev.data);
				break;

			case SE.MOUSE:
				CL.MouseMoveEvent(ev.data);
				break;
		}

		ev = events.shift();
	}
}

/**
 * QueueEvent
 */
function QueueEvent(type, data) {
	data = data || {};
	data.time = SYS.GetMilliseconds();

	events.push({ type: type, data: data });
}

/**
 * SplitBuffer
 */

// Splits by non-quoted semicolons.
var splitRegex = /(?:\"[^\"]*\"|[^;])+/g;

function SplitBuffer(buffer) {
	var matches = buffer.match(splitRegex);

	if (!matches) {
		return null;
	}

	for (var i = 0; i < matches.length; i++) {
		matches[i] = matches[i].replace(/^\s+|\s+$/g, '');
	}

	return matches;
}

/**
 * SplitArguments
 */

// This regex will split space delimited strings,
// honoring quotation mark groups.
var argsRegex = /([^"\s]+)|"((?:\\"|[^"])+)"/g;

function SplitArguments(buffer) {
	var args = [];

	var m;
	while ((m = argsRegex.exec(buffer))) {
		var val = m[1] || m[2];

		// Unescape quotes.
		val = val.replace(/\\"/g, '"');

		args.push(val);
	}

	return args;
}

/**
 * ExecuteStartupCommands
 */
function ExecuteStartupCommands(cvarsOnly, callback) {
	var startup = SYS.GetStartupCommands();

	var tasks = [];

	// Split and merge all commands into a flat list.
	var cmds = [];

	startup.forEach(function (cmd) {
		var split = SplitBuffer(cmd);

		if (split) {
			cmds.push.apply(cmds, split);
		}
	});

	cmds.forEach(function (cmd) {
		var args = SplitArguments(cmd);

		if (cvarsOnly && args[0] !== 'set') {
			return;
		} else if (!cvarsOnly && args[0] === 'set') {
			return;
		}

		tasks.push(function (cb) {
			ExecuteBuffer(cmd, cb);
		});
	});

	// Execute tasks.
	async.series(tasks, function (err) {
		callback(err);
	});
}

/**
 * ExecuteBuffer
 */
function ExecuteBuffer(buffer, callback) {
	var matches = SplitBuffer(buffer);

	if (!matches) {
		if (callback) {
			callback(new Error('Failed to parse buffer.'));
		}
		return;
	}

	// Queue up all of the tasks.
	var tasks = [];

	matches.forEach(function (buffer) {
		var args = SplitArguments(buffer);
		var cmd = args[0];

		var cmdcb = GetCmd(cmd);

		// Special casing for now since it's the only async
		// command.
		// FIXME: Add COM.AddCmdAsync?
		if (cmd === 'exec') {
			tasks.push(function (cb) {
				ExecuteFile(args[1], cb);
			});
		}
		// Try to look up the cmd in the registered cmds.
		else if (cmdcb) {
			tasks.push(function (cb) {
				cmdcb.apply(this, args.slice(1));
				cb(null);
			});
		}
		// If cb is explicitly null, forward this command to
		// the server.
		else if (cmdcb === null) {
			tasks.push(function (cb) {
				CL.ForwardCommandToServer(args);
				cb(null);
			});
		}
		else {
			log('Unknown command for \'' + buffer + '\'');
		}
	});

	// Execute tasks.
	async.series(tasks, function (err) {
		if (callback) {
			callback(err);
		}
	});
}

/**
 * ExecuteFile
 */
function ExecuteFile(filename, callback) {
	if (!filename) {
		log('Enter a filename to execeute.');

		if (callback) {
			callback(new Error('Enter a filename to execeute.'));
		}
		return;
	}

	SYS.ReadFile(filename, 'utf8', function (err, data) {
		if (err) {
			log('Failed to execute \'' + filename + '\'');

			if (callback) {
				callback(err);
			}
			return;
		}

		// Split by newline.
		var lines = data.split(/[\r\n]+|\r+|\n+/);

		var tasks = [];
		lines.forEach(function (line) {
			// Trim and ignore blank lines.
			line = line.replace(/^\s+|\s+$/g, '');
			if (!line) {
				return;
			}

			tasks.push(function (cb) {
				ExecuteBuffer(line, cb);
			});
		});

		// Execute all of the commands.
		async.series(tasks, function (err) {
			callback(err);
		});
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
	ExecuteFile('~/user.cfg', function (err) {
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
	var filename = '~/user.cfg';

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

		str += 'set ' + name + ' \"' + cvars[name] + '\"\n';
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
			BeginRedirect:         BeginRedirect,
			EndRedirect:           EndRedirect,
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
			StringToAddr:          StringToAddr,
			SockToString:          SockToString,
			NetConnect:            NetConnect,
			NetListen:             NetListen,
			NetSend:               NetSend,
			NetOutOfBandPrint:     NetOutOfBandPrint,
			NetClose:              NetClose,
			NetchanSetup:          NetchanSetup,
			NetchanTransmit:       NetchanTransmit,
			NetchanProcess:        NetchanProcess,
			LoadBsp:               LoadBsp
		}
	};

	Object.defineProperty(exports.COM, 'frameTime', {
		get: function () { return frameTime; }
	});

	return exports;
}
