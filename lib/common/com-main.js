var SYS,
	CL,
	SV;

var dedicated,
	events,
	frameTime,
	lastFrameTime,
	startupCvarsOnly,
	startupCommandsOnly,
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
			// Override anything from the config files with command line args.
			// FIXME: Only execute set commands?
			startupCvarsOnly = true;
			SYS.ExecuteCommandLine(function (err) {
				startupCvarsOnly = false;
				cb(err);
			});
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
			// Call again after client / server have loaded. Many of the commands
			// aren't available on the first run.
			startupCommandsOnly = true;
			SYS.ExecuteCommandLine(function (err) {
				startupCommandsOnly = false;
				cb(err);
			});
		},
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
function ExecuteBuffer(buffer, callback) {
	var matches = buffer.split(';');

	if (!matches.length) {
		if (callback) {
			callback(new Error('Failed to parse buffer.'));
		}
		return;
	}

	// Queue up all of the tasks.
	var tasks = [];

	matches.forEach(function (buffer) {
		buffer = buffer.replace(/^\s+|\s+$/g, '');  // trim

		var args = buffer.split(' ');
		var cmd = args[0];

		// We need to filter startup arguments differently at
		// different stages of initialization.
		if (startupCvarsOnly && cmd !== 'set') {
			return;
		} else if (startupCommandsOnly && cmd === 'set') {
			return;
		}

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

		// Trim data.
		data = data.replace(/^\s+|\s+$/g, '');

		// Split by newline.
		var lines = data.split(/[\r\n]+|\r+|\n+/);

		var tasks = [];

		lines.forEach(function (line) {
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
	ExecuteFile('user.cfg', function (err) {
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
