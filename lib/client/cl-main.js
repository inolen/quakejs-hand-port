var sys;
var com;
var cm;
var ui;
var cg;
var snd;

var cl;
var clc;
var cls;

var cl_name;
var cl_model;
var cl_sensitivity;
var cl_showTimeDelta;

/**
 * log
 */
function log() {
	var args = Array.prototype.slice.call(arguments);
	args.splice(0, 0, 'CL:');
	Function.apply.call(console.log, console, args);
}

/**
 * Init
 */
function Init(sys_, com_) {
	log('Initializing');

	sys = sys_;
	com = com_;

	cm  = clipmap.CreateInstance(sys);
	
	var exports = {
		// used by ui
		Bind:                     CmdBind,
		UnbindAll:                CmdUnbindAll,
		GetKeyNamesForCmd:        GetKeyNamesForCmd,
		CaptureInput:             CaptureInput,
		Disconnect:               Disconnect,
		// used by cgame
		CMD_BACKUP:               CMD_BACKUP,
		GetGameState:             function () { return cl.gameState; },
		GetCurrentUserCmdNumber:  GetCurrentUserCmdNumber,
		GetUserCmd:               GetUserCmd,
		SetUserCmdValue:          SetUserCmdValue,
		GetCurrentSnapshotNumber: GetCurrentSnapshotNumber,
		GetSnapshot:              GetSnapshot,
		// used by renderer
		EmitCollisionSurfaces:    cm.EmitCollisionSurfaces
	};

	re = renderer.CreateInstance(sys, com, exports);
	snd = sound.CreateInstance(SoundExports());
	ui  = uinterface.CreateInstance(UIExports());
	cg  = cgame.CreateInstance(CGameExports());
	
	ClearState();
	clc = new ClientConnection();
	cls = new ClientStatic();
	cls.realtime = 0;
	
	cl_name = com.AddCvar('name', 'UnnamedPlayer', CvarFlags.ARCHIVE | CvarFlags.USERINFO);
	cl_model = com.AddCvar('model', 'sarge', CvarFlags.ARCHIVE | CvarFlags.USERINFO);
	cl_sensitivity = com.AddCvar('cl_sensitivity', 2, CvarFlags.ARCHIVE);
	cl_showTimeDelta = com.AddCvar('cl_showTimeDelta', 0, CvarFlags.ARCHIVE);
	
	RegisterCommands();
	RegisterDefaultBinds();
	snd.Init();
	ui.Init();
	
	// TODO: move this out of init function
	snd.StartBackgroundTrack('sonic5', true);
	
	cls.initialized = true;
}

/**
 * CGameExports
 */
function CGameExports() {
	return {
		SYS_GetMilliseconds:         sys.GetMilliseconds,
		SYS_ReadFile:                sys.ReadFile,

		COM_AddCmd:                  com.AddCmd,
		COM_AddCvar:                 com.AddCvar,
		COM_Error:                   com.error,

		CL_GetGameState:             function () { return cl.gameState; },
		CL_GetCurrentUserCmdNumber:  GetCurrentUserCmdNumber,
		CL_GetUserCmd:               GetUserCmd,
		CL_SetUserCmdValue:          SetUserCmdValue,
		CL_GetCurrentSnapshotNumber: GetCurrentSnapshotNumber,
		CL_GetSnapshot:              GetSnapshot,

		CM_LoadMap:                  cm.LoadMap,
		CM_InlineModel:              cm.InlineModel,
		CM_TempBoxModel:             cm.TempBoxModel,
		CM_TransformedBoxTrace:      cm.TransformedBoxTrace,
		CM_BoxTrace:                 cm.BoxTrace,

		RE_LoadMap:                  re.LoadMap,
		RE_RegisterModel:            re.RegisterModel,
		RE_RegisterSkin:             re.RegisterSkin,
		RE_AddRefEntityToScene:      re.AddRefEntityToScene,
		RE_LerpTag:                  re.LerpTag,
		RE_RenderScene:              re.RenderScene,
		RE_GetCounts:                re.GetCounts,
		// TODO remove.
		RE_BuildCollisionBuffers:    re.BuildCollisionBuffers,

		SND_StartSound:              snd.StartSound,
		SND_StartBackgroundTrack:    snd.StartBackgroundTrack,

		UI_RegisterImage:            ui.RegisterImage,
		UI_GetView:                  ui.GetView,
		UI_RenderView:               ui.RenderView,
		UI_Render:                   ui.Render
	};
}

/**
 * RendererExports
 */
function RendererExports() {
	return {
		CM_EmitCollisionSurfaces: cm.EmitCollisionSurfaces
	};
}

/**
 * SoundExports
 */
function SoundExports() {
	return {
		SYS_ReadFile: sys.ReadFile
	};
}

/**
 * UIExports
 */
function UIExports() {
	return {
		SYS_GetMilliseconds:  sys.GetMillisecnds,
		SYS_ReadFile:         sys.ReadFile,
		SYS_GetUIContext:     sys.GetUIContext,

		COM_GetCvarVal:       com.GetCvarVal,

		CL_Bind:              CmdBind,
		CL_UnbindAll:         CmdUnbindAll,
		CL_GetKeyNamesForCmd: GetKeyNamesForCmd,
		CL_CaptureInput:      CaptureInput,

		SND_StartSound:       snd.StartSound
	};
}

/**
 * ClearState
 */
function ClearState() {
	log('Clearing state');

	cl = new ClientLocals();
}

/**
 * InitCGame
 */
function InitCGame() {
	clc.state = ConnectionState.LOADING;
	cg.Init(clc.serverMessageSequence, clc.lastExecutedServerCommand, clc.clientNum);
	// We will send a usercmd this frame, which will cause
	// the server to send us the first snapshot.
	clc.state = ConnectionState.PRIMED;
}

/**
 * ShutdownCGame
 */
function ShutdownCGame() {
	cg.Shutdown();
}

/**
 * InitSubsystems
 */
function InitSubsystems() {
	if (!cls.rendererStarted) {
		re.Init();
		cls.rendererStarted = true;
	}

	if (!cls.soundStarted) {
		snd.Init();
		cls.soundStarted = true;
	}
}

/**
 * ShutdownSubsystems
 */
function ShutdownSubsystems() {
	re.Shutdown();
	cls.renderStarted = false;

	snd.Shutdown();
	cls.soundStarted = false;
}

/**
 * Frame
 */
function Frame(msec) {
	if (!cls.initialized) {
		return;
	}

	cls.frameDelta = msec;
	cls.realTime += cls.frameDelta;

	// See if we need to update any userinfo.
	CheckUserinfo();

	// Send intentions now.
	SendCommand();

	// Resend a connection request if necessary.
	CheckForResend();

	// Decide on the serverTime to render.
	SetCGameTime();

	UpdateScreen();
}

/**
 * CheckUserinfo
 */
function CheckUserinfo() {
	// Don't add reliable commands when not yet connected.
	if (clc.state < ConnectionState.CONNECTED) {
		return;
	}

	// Send a reliable userinfo update if needed.
	/*if (cvar_modifiedFlags & CvarFlags.USERINFO) {
		cvar_modifiedFlags &= ~CVAR_USERINFO;
		AddReliableCommand('userinfo ' + JSON.stringify(com.GetCvarKeyValues(CvarFlags.USERINFO));
	}*/
}

/**
 * CheckForResend
 *
 * Resend a connect message if the last one has timed out
 */
function CheckForResend() {
	// Resend if we haven't gotten a reply yet.
	if (clc.state !== ConnectionState.CONNECTING && clc.state !== ConnectionState.CHALLENGING) {
		return;
	}

	if (cls.realTime - clc.connectTime < RETRANSMIT_TIMEOUT) {
		return;
	}

	// Since we're on TCP/IP, this whole CheckForResend() doesn't make much sense.
	if (!clc.netchan) {
		clc.netchan = com.NetchanSetup(NetSrc.CLIENT, clc.serverAddress);
	}
	
	clc.connectTime = cls.realTime;  // for retransmit requests
	clc.connectPacketCount++;

	log('CheckForResend', clc.state);

	switch (clc.state) {
		/*case ConnectionState.CONNECTING:
			// The challenge request shall be followed by a client challenge so no malicious server can hijack this connection.
			// Add the gamename so the server knows we're running the correct game or can reject the client
			// with a meaningful message
			Com_sprintf(data, sizeof(data), "getchallenge %d %s", clc.challenge, com_gamename->string);
			NET_OutOfBandPrint(NS_CLIENT, clc.serverAddress, "%s", data);
			break;*/
			
		case ConnectionState.CHALLENGING:
			// sending back the challenge
			// port = Cvar_VariableValue ("net_qport");
			// Info_SetValueForKey(info, "protocol", va("%i", com_protocol->integer));
			// Info_SetValueForKey( info, "qport", va("%i", port ) );
			// Info_SetValueForKey( info, "challenge", va("%i", clc.challenge ) );
			var str = 'connect ' + JSON.stringify(com.GetCvarKeyValues(CvarFlags.USERINFO));
			com.NetchanPrint(clc.netchan, str);
			// The most current userinfo has been sent, so watch for any
			// newer changes to userinfo variables.
			//cvar_modifiedFlags &= ~CVAR_USERINFO;
			break;

		default:
			error(Err.FATAL, 'CheckForResend: bad clc.state');
	}
}

/**
 * UpdateScreen
 */
function UpdateScreen() {
	switch (clc.state) {
		case ConnectionState.DISCONNECTED:
			// Don't push a menu if one already exists.
			if (!ui.PeekMenu()) {
				ui.PushMenu('main');
			}
			break;
		case ConnectionState.CONNECTING:
		case ConnectionState.CHALLENGING:
		case ConnectionState.CONNECTED:
		case ConnectionState.LOADING:
		case ConnectionState.PRIMED:
			ui.PopAllMenus();
			ui.RenderView(ui.GetView('connect'));
			break;
		case ConnectionState.ACTIVE:
			cg.Frame(cl.serverTime);
			break;
	}

	ui.Render();
}

/**
 * MapLoading
 */
function MapLoading() {
	if (clc.state >= ConnectionState.CONNECTED /*&& !Q_stricmp( clc.servername, "localhost" ) */) {
		clc.state = ConnectionState.CONNECTED;		// so the connect screen is drawn
		/*Com_Memset( cls.updateInfoString, 0, sizeof( cls.updateInfoString ) );
		Com_Memset( clc.serverMessage, 0, sizeof( clc.serverMessage ) );
		Com_Memset( &cl.gameState, 0, sizeof( cl.gameState ) );
		clc.lastPacketSentTime = -9999;
		SCR_UpdateScreen();*/
	} else {
		Disconnect();

		clc.serverName = 'localhost:9000';
		clc.serverAddress = StringToAddr(clc.serverName);

		clc.state = ConnectionState.CHALLENGING;  // so the connect screen is drawn
		/*Key_SetCatcher( 0 );
		SCR_UpdateScreen();*/
		clc.connectTime = -99999;
		CheckForResend();
	}
}

/**
 * Disconnect
 */
function Disconnect(showMainMenu) {
	/*if (!com_cl_running || !com_cl_running->integer) {
		return;
	}*/

	ui.PushMenu('main');

	// Send a disconnect message to the server.
	// Send it a few times in case one is dropped.
	if (clc.state >= ConnectionState.CONNECTED) {
		AddReliableCommand('disconnect');
		WritePacket();
		// We're on TCP/IP doesn't matter.
		//WritePacket();
		//WritePacket();
	}
	
	ClearState();

	// Wipe the client connection.
	clc = new ClientConnection();
	clc.state = ConnectionState.DISCONNECTED;
}


/**
 * AddReliableCommand
 *
 * The given command will be transmitted to the server, and is gauranteed to
 * not have future usercmd_t executed before it is executed
*/
function AddReliableCommand(cmd/*, isDisconnectCmd*/) {
	/*int unacknowledged = clc.reliableSequence - clc.reliableAcknowledge;
	
	// If we would be losing an old command that hasn't been acknowledged,
	// we must drop the connection, also leave one slot open for the
	// disconnect command in this case.
	if ((isDisconnectCmd && unacknowledged > MAX_RELIABLE_COMMANDS) ||
	    (!isDisconnectCmd && unacknowledged >= MAX_RELIABLE_COMMANDS))
	{
		if (com_errorEntered) {
			return;
		} else {
			com.error(Err.DROP, 'Client command overflow');
		}
	}*/
	clc.reliableCommands[++clc.reliableSequence % MAX_RELIABLE_COMMANDS] = cmd;
}

/**
 * PacketEvent
 */
function PacketEvent(buffer) {
	if (!cls.initialized) {
		return;
	}

	var msg = new ByteBuffer(buffer, ByteBuffer.LITTLE_ENDIAN);

	// Peek in and see if this is a string message.
	if (buffer.byteLength > 4 && msg.view.getInt32(0, !!ByteBuffer.LITTLE_ENDIAN) === -1) {
		ConnectionlessPacket(msg);
		return;
	}

	if (clc.state < ConnectionState.CONNECTED) {
		return;  // can't be a valid sequenced packet
	}

	if (!com.NetchanProcess(clc.netchan, msg)) {
		return;
	}

	// Track the last message received so it can be returned in 
	// client messages, allowing the server to detect a dropped
	// gamestate.
	clc.serverMessageSequence = clc.netchan.incomingSequence;

	ParseServerMessage(msg);
}

/**
 * ConnectionlessPacket
 */
function ConnectionlessPacket(msg) {
	msg.readInt();  // Skip the -1.

	var str = msg.readCString();

	if (str === 'connectResponse') {
		if (clc.state >= ConnectionState.CONNECTED) {
			console.warn('Dup connect received. Ignored.');
			return;
		}
		if (clc.state != ConnectionState.CHALLENGING) {
			console.warn('connectResponse packet while not connecting. Ignored.');
			return;
		}
		/*if ( !NET_CompareAdr( from, clc.serverAddress ) ) {
			Com_Printf( "connectResponse from wrong address. Ignored.\n" );
			return;
		}*/

		log('Got connection response');
		
		clc.state = ConnectionState.CONNECTED;
		clc.lastPacketSentTime = -9999;  // send first packet immediately
	}
}