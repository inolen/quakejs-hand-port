var com;

var cl;
var clc;
var cls = new ClientStatic();
var cl_sensitivity;
var cl_showTimeDelta;
var commands = {};
var keys = {};

function Init(cominterface) {
	console.log('--------- CL Init ---------');

	com = cominterface;

	ClearState();
	clc = new ClientConnection();
	cls.realtime = 0;

	cl_sensitivity = com.AddCvar('cl_sensitivity', 2);
	cl_showTimeDelta = com.AddCvar('cl_showTimeDelta', 0);

	InputInit();
	CmdInit();
	InitRenderer();

	cls.initialized = true;

	setTimeout(function () {
		//CmdConnect('192.168.0.102:9001');
		CmdConnect('localhost:9000');
	}, 100);
}

function ClearState() {
	console.log('Clearing client state');

	cl = new ClientLocals();
}

function InitCGame() {
	var cginterface = {
		AddCmd:                      com.AddCmd,
		AddCvar:                     com.AddCvar,
		GetMilliseconds:             com.GetMilliseconds,
		GetGameState:                function () { return cl.gameState; },
		GetCurrentUserCommandNumber: GetCurrentUserCommandNumber,
		GetUserCommand:              GetUserCommand,
		GetCurrentSnapshotNumber:    GetCurrentSnapshotNumber,
		GetSnapshot:                 GetSnapshot,
		LoadClipMap:                 cm.LoadMap,
		LoadRenderMap:               re.LoadMap,
		Trace:                       cm.Trace,
		CreateElement:               re.CreateElement,
		DeleteElement:               re.DeleteElement,
		DrawText:                    re.DrawText,
		RenderScene:                 re.RenderScene
	};

	clc.state = ConnectionState.LOADING;
	cg.Init(cginterface, clc.serverMessageSequence);
	clc.state = ConnectionState.PRIMED;
}

function ShutdownCGame() {
	cg.Shutdown();
}

function InitRenderer() {
	var reinterface = {
		AddCmd:                      com.AddCmd,
		AddCvar:                     com.AddCvar,
		GetMilliseconds:             com.GetMilliseconds,
		ReadFile:                    com.ReadFile,
		GetGameRenderContext:        com.GetGameRenderContext,
		GetUIRenderContext:          com.GetUIRenderContext
	};

	re.Init(reinterface);
}

function ShutdownRenderer() {
	re.Shutdown();
}

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
		NET_StringToAdr( clc.servername, &clc.serverAddress, NA_UNSPEC);
		// we don't need a challenge on the localhost
		CL_CheckForResend();*/
	}
}

function PacketEvent(addr, buffer) {
	if (!cls.initialized) {
		return;
	}

	var msg = new ByteBuffer(buffer, ByteBuffer.LITTLE_ENDIAN);

	if (buffer.byteLength > 4 && msg.view.getInt32(0, !!ByteBuffer.LITTLE_ENDIAN) === -1) {
		ParseStringMessage(addr, msg);
		return;
	}

	ParseServerMessage(msg);
}

function ParseStringMessage(addr, msg) {
	// Throw away header int.
	msg.readInt();

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

		clc.state = ConnectionState.CONNECTED;
		clc.lastPacketSentTime = -9999;  // send first packet immediately
	}
}