var cl;
var clc;
var cls;

var cl_name,
	cl_model,
	cl_sensitivity,
	cl_showTimeDelta;

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

	cm  = clipmap.CreateInstance(ClipmapExports());
	re  = renderer.CreateInstance(RendererExports());
	snd = sound.CreateInstance(SoundExports());
	ui  = uinterface.CreateInstance(UIExports());
	cg  = cgame.CreateInstance(CGameExports());
	
	cl = new ClientLocals();
	clc = new ClientConnection();
	cls = new ClientStatic();
	cls.realtime = 0;
	
	cl_name          = com.AddCvar('name',            'UnnamedPlayer', CVF.ARCHIVE | CVF.USERINFO);
	cl_model         = com.AddCvar('model',           'sarge',         CVF.ARCHIVE | CVF.USERINFO);
	cl_sensitivity   = com.AddCvar('cl_sensitivity',   2,              CVF.ARCHIVE);
	cl_showTimeDelta = com.AddCvar('cl_showTimeDelta', 0,              CVF.ARCHIVE);
	
	RegisterCommands();
	InitSubsystems();
	
	cls.initialized = true;
}

/**
 * ClipmapExports
 */
function ClipmapExports() {
	return {
		sys_ReadFile: sys.ReadFile
	};
}

/**
 * RendererExports
 */
function RendererExports() {
	return {
		sys_GetGLContext:         sys.GetGLContext,
		sys_GetMilliseconds:      sys.GetMillisecnds,
		sys_ReadFile:             sys.ReadFile,
		
		com_AddCvar:              com.AddCvar,
		com_AddCmd:               com.AddCmd,
		
		cm_EmitCollisionSurfaces: cm.EmitCollisionSurfaces
	};
}

/**
 * SoundExports
 */
function SoundExports() {
	return {
		sys_ReadFile: sys.ReadFile,

		com_AddCvar:  com.AddCvar
	};
}

/**
 * UIExports
 */
function UIExports() {
	return {
		sys_GetMilliseconds:  sys.GetMillisecnds,
		sys_ReadFile:         sys.ReadFile,
		sys_GetUIContext:     sys.GetUIContext,

		com_GetCvarVal:       com.GetCvarVal,
		com_SetCvarVal:       com.SetCvarVal,
		com_LoadConfig:       com.LoadConfig,
		com_SaveConfig:       com.SaveConfig,
		com_ExecuteBuffer:    com.ExecuteBuffer,

		cl_Bind:              CmdBind,
		cl_UnbindAll:         CmdUnbindAll,
		cl_GetKeyNamesForCmd: GetKeyNamesForCmd,
		cl_CaptureInput:      CaptureInput,
		cl_Disconnect:        Disconnect,

		snd_StartSound:       snd.StartSound
	};
}

/**
 * CGameExports
 */
function CGameExports() {
	return {
		sys_GetMilliseconds:         sys.GetMilliseconds,
		sys_ReadFile:                sys.ReadFile,

		com_AddCmd:                  com.AddCmd,
		com_AddCvar:                 com.AddCvar,
		com_Error:                   com.error,

		cl_GetGameState:             function () { return cl.gameState; },
		cl_GetServerCommand:         GetServerCommand,
		cl_GetCurrentUserCmdNumber:  GetCurrentUserCmdNumber,
		cl_GetUserCmd:               GetUserCmd,
		cl_SetUserCmdValue:          SetUserCmdValue,
		cl_GetCurrentSnapshotNumber: GetCurrentSnapshotNumber,
		cl_GetSnapshot:              GetSnapshot,

		cm_LoadMap:                  cm.LoadMap,
		cm_InlineModel:              cm.InlineModel,
		cm_TempBoxModel:             cm.TempBoxModel,
		cm_TransformedBoxTrace:      cm.TransformedBoxTrace,
		cm_BoxTrace:                 cm.BoxTrace,

		re_LoadMap:                  re.LoadMap,
		re_RegisterShader:           re.RegisterShader,
		re_RegisterModel:            re.RegisterModel,
		re_RegisterSkin:             re.RegisterSkin,
		re_AddRefEntityToScene:      re.AddRefEntityToScene,
		re_LerpTag:                  re.LerpTag,
		re_RenderScene:              re.RenderScene,
		re_GetCounts:                re.GetCounts,
		// TODO remove.
		re_BuildCollisionBuffers:    re.BuildCollisionBuffers,

		snd_RegisterSound:           snd.RegisterSound,
		snd_StartSound:              snd.StartSound,
		snd_StartBackgroundTrack:    snd.StartBackgroundTrack,
		snd_Respatialize:            snd.Respatialize,
		snd_UpdateEntityPosition:    snd.UpdateEntityPosition,

		ui_RegisterImage:            ui.RegisterImage,
		ui_GetView:                  ui.GetView,
		ui_RenderView:               ui.RenderView,
		ui_Render:                   ui.Render
	};
}

/**
 * InitCGame
 */
function InitCGame() {
	clc.state = CA.LOADING;
	cg.Init(clc.serverMessageSequence, clc.lastExecutedServerCommand, clc.clientNum);
	// We will send a usercmd this frame, which will cause
	// the server to send us the first snapshot.
	clc.state = CA.PRIMED;
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

	if (!cls.uiStarted) {
		ui.Init();
		cls.uiStarted = true;
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

	ui.Shutdown();
	cls.uiStarted = false;
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

	// Update CGame / UI.
	UpdateScreen();

	// Update audio.
	snd.Frame();
}

/**
 * CheckUserinfo
 */
function CheckUserinfo() {
	// Don't add reliable commands when not yet connected.
	if (clc.state < CA.CONNECTED) {
		return;
	}

	// Send a reliable userinfo update if needed.
	// if (com.cvarModifiedFlags & CVF.USERINFO) {
	// 	com.cvarModifiedFlags &= ~CVF.USERINFO;
	// 	AddReliableCommand('userinfo ' + JSON.stringify(com.GetCvarValues(CVF.USERINFO)));
	// }
}

/**
 * CheckForResend
 *
 * Resend a connect message if the last one has timed out
 */
function CheckForResend() {
	// Resend if we haven't gotten a reply yet.
	if (clc.state !== CA.CONNECTING && clc.state !== CA.CHALLENGING) {
		return;
	}

	if (cls.realTime - clc.connectTime < RETRANSMIT_TIMEOUT) {
		return;
	}

	// Since we're on TCP/IP, this whole CheckForResend() doesn't make much sense.
	if (!clc.netchan) {
		clc.netchan = com.NetchanSetup(sh.NetSrc.CLIENT, clc.serverAddress);
	}
	
	clc.connectTime = cls.realTime;  // for retransmit requests
	clc.connectPacketCount++;

	log('CheckForResend', clc.state);

	switch (clc.state) {
		/*case CA.CONNECTING:
			// The challenge request shall be followed by a client challenge so no malicious server can hijack this connection.
			// Add the gamename so the server knows we're running the correct game or can reject the client
			// with a meaningful message
			Com_sprintf(data, sizeof(data), "getchallenge %d %s", clc.challenge, com_gamename->string);
			NET_OutOfBandPrint(NS_CLIENT, clc.serverAddress, "%s", data);
			break;*/
			
		case CA.CHALLENGING:
			// sending back the challenge
			// port = Cvar_VariableValue ("net_qport");
			// Info_SetValueForKey(info, "protocol", va("%i", com_protocol->integer));
			// Info_SetValueForKey( info, "qport", va("%i", port ) );
			// Info_SetValueForKey( info, "challenge", va("%i", clc.challenge ) );
			var str = 'connect ' + JSON.stringify(com.GetCvarValues(CVF.USERINFO));
			com.NetchanPrint(clc.netchan, str);
			// The most current userinfo has been sent, so watch for any
			// newer changes to userinfo variables.
			// com.cvarModifiedFlags &= ~CVF.USERINFO;
			break;

		default:
			error(sh.Err.FATAL, 'CheckForResend: bad clc.state');
	}
}

/**
 * UpdateScreen
 */
function UpdateScreen() {
	if (!cls.uiStarted) {
		return;
	}

	switch (clc.state) {
		case CA.DISCONNECTED:
			// Don't push a menu if one already exists.
			if (!ui.PeekMenu()) {
				ui.PushMenu('main');
			}
			break;
		case CA.CONNECTING:
		case CA.CHALLENGING:
		case CA.CONNECTED:
		case CA.LOADING:
		case CA.PRIMED:
			ui.PopAllMenus();
			ui.RenderView(ui.GetView('connect'));
			break;
		case CA.ACTIVE:
			cg.Frame(cl.serverTime);
			break;
	}

	ui.Render();
}

/**
 * MapLoading
 */
function MapLoading() {
	if (clc.state >= CA.CONNECTED /*&& !Q_stricmp( clc.servername, "localhost" ) */) {
		clc.state = CA.CONNECTED;		// so the connect screen is drawn
		/*Com_Memset( cls.updateInfoString, 0, sizeof( cls.updateInfoString ) );
		Com_Memset( clc.serverMessage, 0, sizeof( clc.serverMessage ) );
		Com_Memset( &cl.gameState, 0, sizeof( cl.gameState ) );
		clc.lastPacketSentTime = -9999;
		SCR_UpdateScreen();*/
	} else {
		Disconnect();

		clc.serverName = 'localhost:9000';
		clc.serverAddress = StringToAddr(clc.serverName);

		clc.state = CA.CHALLENGING;  // so the connect screen is drawn
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

	if (cls.uiStarted) {
		ui.PushMenu('main');
	}

	// Send a disconnect message to the server.
	// Send it a few times in case one is dropped.
	if (clc.state >= CA.CONNECTED) {
		AddReliableCommand('disconnect');
		WritePacket();
		// We're on TCP/IP doesn't matter.
		//WritePacket();
		//WritePacket();
	}
	
	// Wipe out the local client state.
	cl = new ClientLocals();

	// Wipe the client connection.
	clc = new ClientConnection();
	clc.state = CA.DISCONNECTED;
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
			com.error(sh.Err.DROP, 'Client command overflow');
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

	if (clc.state < CA.CONNECTED) {
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
		if (clc.state >= CA.CONNECTED) {
			console.warn('Dup connect received. Ignored.');
			return;
		}
		if (clc.state != CA.CHALLENGING) {
			console.warn('connectResponse packet while not connecting. Ignored.');
			return;
		}
		/*if ( !NET_CompareAdr( from, clc.serverAddress ) ) {
			Com_Printf( "connectResponse from wrong address. Ignored.\n" );
			return;
		}*/

		log('Got connection response');
		
		clc.state = CA.CONNECTED;
		clc.lastPacketSentTime = -9999;  // send first packet immediately
	}
}
