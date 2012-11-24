var sys;

var dedicated = false;
var events;
var frameTime;
var lastFrameTime;
var initialized = false;

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
	// if (level === sh.Err.DROP) {
	// 	console.error('Server crashed: ' + str);
	// 	sv.Shutdown();
	// 	cl.Disconnect();
	// } else {
		throw new Error(str);
	// }
}

/**
 * Init
 */
function Init(sysinterface, isdedicated) {
	sys = sysinterface;
	dedicated = isdedicated;
	events = [];
	frameTime = lastFrameTime = sys.GetMilliseconds();

	// Load the user's config.
	LoadConfig();

	// If any archived cvars are modified after this, we will trigger a
	// writing of the config file.
	cvarModifiedFlags &= ~CVF.ARCHIVE;

	InitCvar();
	InitCmd();
	
	sv.Init(sys, GetExports(), dedicated);

	if (!dedicated) {
		cl.Init(sys, GetExports());
	}

	initialized = true;
}

/**
 * GetExports
 */
function GetExports() {
	var exports = {
		error:             error,
		ExecuteBuffer:     ExecuteBuffer,
		LoadConfig:        LoadConfig,
		SaveConfig:        SaveConfig,
		AddCvar:           AddCvar,
		GetCvarVal:        GetCvarVal,
		SetCvarVal:        SetCvarVal,
		GetCvarValues:     GetCvarValues,
		AddCmd:            AddCmd,
		GetCmd:            GetCmd,
		NetchanSetup:      NetchanSetup,
		NetchanDestroy:    NetchanDestroy,
		NetchanSend:       NetchanSend,
		NetchanPrint:      NetchanPrint,
		NetchanProcess:    NetchanProcess
	};

	Object.defineProperty(exports, 'frameTime', {
		get: function () { return frameTime; }
	});

	Object.defineProperty(exports, 'cvarModifiedFlags', {
		get: function () { return cvarModifiedFlags; },
		set: function (val) { cvarModifiedFlags = val; }
	});

	return exports;
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

// function Error(code, msg) {
// 	va_list		argptr;
// 	static int	lastErrorTime;
// 	static int	errorCount;
// 	int			currentTime;

// 	if(com_errorEntered)
// 		Sys_Error("recursive error after: %s", com_errorMessage);

// 	com_errorEntered = qtrue;

// 	Cvar_Set("com_errorCode", va("%i", code));

// 	// if we are getting a solid stream of ERR_DROP, do an ERR_FATAL
// 	currentTime = Sys_Milliseconds();
// 	if ( currentTime - lastErrorTime < 100 ) {
// 		if ( ++errorCount > 3 ) {
// 			code = ERR_FATAL;
// 		}
// 	} else {
// 		errorCount = 0;
// 	}
// 	lastErrorTime = currentTime;

// 	va_start (argptr,fmt);
// 	Q_vsnprintf (com_errorMessage, sizeof(com_errorMessage),fmt,argptr);
// 	va_end (argptr);

// 	if (code != ERR_DISCONNECT && code != ERR_NEED_CD)
// 		Cvar_Set("com_errorMessage", com_errorMessage);

// 	if (code == ERR_DISCONNECT || code == ERR_SERVERDISCONNECT) {
// 		VM_Forced_Unload_Start();
// 		SV_Shutdown( "Server disconnected" );
// 		CL_Disconnect( qtrue );
// 		CL_FlushMemory( );
// 		VM_Forced_Unload_Done();
// 		// make sure we can get at our local stuff
// 		FS_PureServerSetLoadedPaks("", "");
// 		com_errorEntered = qfalse;
// 		longjmp (abortframe, -1);
// 	} else if (code == ERR_DROP) {
// 		Com_Printf ("********************\nERROR: %s\n********************\n", com_errorMessage);
// 		VM_Forced_Unload_Start();
// 		SV_Shutdown (va("Server crashed: %s",  com_errorMessage));
// 		CL_Disconnect( qtrue );
// 		CL_FlushMemory( );
// 		VM_Forced_Unload_Done();
// 		FS_PureServerSetLoadedPaks("", "");
// 		com_errorEntered = qfalse;
// 		longjmp (abortframe, -1);
// 	} else if ( code == ERR_NEED_CD ) {
// 		VM_Forced_Unload_Start();
// 		SV_Shutdown( "Server didn't have CD" );
// 		if ( com_cl_running && com_cl_running->integer ) {
// 			CL_Disconnect( qtrue );
// 			CL_FlushMemory( );
// 			VM_Forced_Unload_Done();
// 			CL_CDDialog();
// 		} else {
// 			Com_Printf("Server didn't have CD\n" );
// 			VM_Forced_Unload_Done();
// 		}

// 		FS_PureServerSetLoadedPaks("", "");

// 		com_errorEntered = qfalse;
// 		longjmp (abortframe, -1);
// 	} else {
// 		VM_Forced_Unload_Start();
// 		CL_Shutdown(va("Client fatal crashed: %s", com_errorMessage), qtrue, qtrue);
// 		SV_Shutdown(va("Server fatal crashed: %s", com_errorMessage));
// 		VM_Forced_Unload_Done();
// 	}

// 	Com_Shutdown ();

// 	Sys_Error ("%s", com_errorMessage);
// }

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
	while (m = argsRegex.exec(buffer)) {
		args.push(m[1] || m[2]);
	}

	var cmdcb = GetCmd(args[0]);
	if (cmdcb) {
		cmdcb.apply(this, args.slice(1));
		return;
	}

	var cvar = FindCvar(args[0]);
	if (cvar) {
		CmdCvar.apply(this, args);
		return;
	}
}

/**
 * CheckSaveConfig
 */
function CheckSaveConfig() {
	// Don't save anything until we're fully initialized.
	if (!initialized) {
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
	ExecuteBuffer('exec default.cfg');
}

/**
 * SaveConfig
 */
function SaveConfig(callback) {
	var filename = 'default.cfg';

	var cfg = 'unbindall\n';
	cfg = cl.WriteBindings(cfg);
	cfg = WriteCvars(cfg);

	console.log('Saving config to', filename);

	sys.WriteFile(filename, cfg, 'utf8', callback);
}