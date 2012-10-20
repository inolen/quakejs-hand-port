var com;
var ui;
var cm;
var cg;

var cl;
var clc;
var cls = new ClientStatic();
var cl_sensitivity;
var cl_showTimeDelta;
var commands = {};
var keys = {};

/**
 * Init
 */
function Init(cominterface) {
	console.log('--------- CL Init ---------');

	com = cominterface;
	ui = uinterface.CreateInstance(
		{
			ReadFile: com.ReadFile,
			GetUIRenderContext: com.GetUIRenderContext
		},
		{}
	);
	cm = clipmap.CreateInstance(
		{
			ReadFile: com.ReadFile
		}
	);
	cg = cgame.CreateInstance(
		{
			GetMilliseconds:             com.GetMilliseconds,
		},
		{
			AddCmd:                      com.AddCmd,
			AddCvar:                     com.AddCvar
		},
		{
			GetGameState:                function () { return cl.gameState; },
			GetCurrentUserCommandNumber: GetCurrentUserCommandNumber,
			GetUserCommand:              GetUserCommand,
			GetCurrentSnapshotNumber:    GetCurrentSnapshotNumber,
			GetSnapshot:                 GetSnapshot,
			LoadClipMap:                 cm.LoadMap,
			Trace:                       cm.Trace,
		},
		{
			LoadMap:                     re.LoadMap,
			RegisterModel:               re.RegisterModel,
			AddRefEntityToScene:         re.AddRefEntityToScene,
			RenderScene:                 re.RenderScene
		},
		{
			RenderView:                  ui.RenderView
		}
	);

	ClearState();
	clc = new ClientConnection();	
	cls.realtime = 0;

	cl_sensitivity = com.AddCvar('cl_sensitivity', 2);
	cl_showTimeDelta = com.AddCvar('cl_showTimeDelta', 0);

	InitInput();
	InitCmd();
	InitRenderer();
	ui.Init();

	cls.initialized = true;

	setTimeout(function () {
		//ConnectCmd('192.168.0.102:9001');
		ConnectCmd('localhost:9000');
	}, 100);
}

/**
 * ClearState
 */
function ClearState() {
	console.log('Clearing client state');

	cl = new ClientLocals();
}

/**
 * InitCGame
 */
function InitCGame() {
	clc.state = ConnectionState.LOADING;
	cg.Init(clc.serverMessageSequence);
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
 * InitRenderer
 */
function InitRenderer() {
	var reinterface = {
		AddCmd:                      com.AddCmd,
		AddCvar:                     com.AddCvar,
		GetMilliseconds:             com.GetMilliseconds,
		ReadFile:                    com.ReadFile,
		GetGameRenderContext:        com.GetGameRenderContext
	};

	re.Init(reinterface);
}

/**
 * ShutdownRenderer
 */
function ShutdownRenderer() {
	re.Shutdown();
}

/**
 * Frame
 */
function Frame(frameTime, msec) {
	cls.frameTime = frameTime;

	if (!cls.initialized) {
		return;
	}

	cls.frameDelta = msec;
	cls.realTime += cls.frameDelta;

	SendCommand();

	// Decide on the serverTime to render.
	SetCGameTime();

	UpdateScreen();
}

/**
 * UpdateScreen
 */
function UpdateScreen() {
	switch (clc.state) {
		case ConnectionState.DISCONNECTED:
		case ConnectionState.CONNECTING:
		case ConnectionState.CHALLENGING:
		case ConnectionState.CONNECTED:
		case ConnectionState.LOADING:
		case ConnectionState.PRIMED:
			break;
		case ConnectionState.ACTIVE:
			cg.Frame(cl.serverTime);
			break;
	}
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
		/*// clear nextmap so the cinematic shutdown doesn't execute it
		Cvar_Set( "nextmap", "" );
		CL_Disconnect( qtrue );
		Q_strncpyz( clc.servername, "localhost", sizeof(clc.servername) );*/
		clc.state = ConnectionState.CHALLENGING;		// so the connect screen is drawn
		/*Key_SetCatcher( 0 );
		SCR_UpdateScreen();
		clc.connectTime = -RETRANSMIT_TIMEOUT;
		NET_StringToAdr( clc.servername, &clc.serverAddress, UNSPEC);
		// we don't need a challenge on the localhost
		CL_CheckForResend();*/
	}
}

/**
 * Disconnect
 */
function Disconnect(showMainMenu) {
	/*if (!com_cl_running || !com_cl_running->integer) {
		return;
	}

	if (uivm && showMainMenu) {
		VM_Call( uivm, UI_SET_ACTIVE_MENU, UIMENU_NONE );
	}*/

	// Send a disconnect message to the server.
	// Send it a few times in case one is dropped.
	if (clc.state >= ConnectionState.CONNECTED) {
		AddReliableCommand('disconnect');
		WritePacket();
		// We're on TCP/IP doesn't matter.
		//WritePacket();
		//WritePacket();
	}
	
	ClearState ();

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
			throw new Error('Client command overflow');
		}
	}*/
	clc.reliableCommands[++clc.reliableSequence % MAX_RELIABLE_COMMANDS] = cmd;
}

/**
 * PacketEvent
 */
function PacketEvent(addr, buffer) {
	if (!cls.initialized) {
		return;
	}

	var msg = new ByteBuffer(buffer, ByteBuffer.LITTLE_ENDIAN);

	// Peek in and see if this is a string message.
	if (buffer.byteLength > 4 && msg.view.getInt32(0, !!ByteBuffer.LITTLE_ENDIAN) === -1) {
		ParseStringMessage(addr, msg);
		return;
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
 * ParseStringMessage
 */
function ParseStringMessage(addr, msg) {
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

		// TODO Setup netchan here, make cl-cmd.js just send the connect request.
		//Netchan_Setup(NS_CLIENT, &clc.netchan, from, Cvar_VariableValue("net_qport"), clc.challenge, qfalse);

		console.log('Got connection response');
		
		clc.state = ConnectionState.CONNECTED;
		clc.lastPacketSentTime = -9999;  // send first packet immediately
	}
}