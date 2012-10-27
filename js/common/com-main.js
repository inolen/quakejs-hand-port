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

	RegisterCommands();
	
	var exports = {
		ExecuteCmdText:   ExecuteCmdText,
		LoadConfig:       LoadConfig,
		SaveConfig:       SaveConfig,
		AddCvar:          AddCvar,
		GetCvarVal:       GetCvarVal,
		SetCvarVal:       SetCvarVal,
		GetCvarKeyValues: GetCvarKeyValues,
		AddCmd:           AddCmd,
		GetCmd:           GetCmd,
		NetchanSetup:     NetchanSetup,
		NetchanDestroy:   NetchanDestroy,
		NetchanSend:      NetchanSend,
		NetchanPrint:     NetchanPrint,
		NetchanProcess:   NetchanProcess
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
			case EventTypes.NETCLMESSAGE:
				cl.PacketEvent(ev.addr, ev.buffer);
				break;
			/*case EventTypes.NETSVCONNECT:
				sv.ClientConnect(ev.addr, ev.socket);
				break;
			case EventTypes.NETSVDISCONNECT:
				sv.ClientDisconnect(ev.addr);
				break;*/
			case EventTypes.NETSVMESSAGE:
				sv.PacketEvent(ev.addr, ev.socket, ev.buffer);
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
 * ExecuteCmdText
 */
function ExecuteCmdText(text) {
	var split = text.split(' ');
	var arg0 = split[0];
	var args = split.slice(1);
	var cmdcb;
	var cvar;

	if ((cmdcb = GetCmd(arg0))) {
		cmdcb.apply(this, args);
	} else if ((cvar = FindCvar(arg0))) {
		cvar(args[0]);
	}
}

/**
 * LoadConfig
 */
function LoadConfig() {
	ExecuteCmdText('exec default.cfg');
}

/**
 * SaveConfig
 */
function SaveConfig(callback) {
	var cfg = 'unbindall\n';

	cfg = cl.WriteBindings(cfg);
	cfg = WriteCvars(cfg);

	sys.WriteFile('default.cfg', cfg, 'utf8', callback);
}