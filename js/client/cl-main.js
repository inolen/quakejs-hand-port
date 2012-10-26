var sys;
var com;
var cm;
var ui;
var cg;

var cl;
var clc;
var cls;

var cl_name;
var cl_model;
var cl_sensitivity;
var cl_showTimeDelta;

/**
 * Init
 */
function Init(sysinterface, cominterface) {
	console.log('--------- CL Init ---------');

	var exports = {
		Bind:                        CmdBind,
		GetKeyNamesForCmd:           GetKeyNamesForCmd,
		GetGameState:                function () { return cl.gameState; },
		GetCurrentUserCommandNumber: GetCurrentUserCommandNumber,
		GetUserCommand:              GetUserCommand,
		GetCurrentSnapshotNumber:    GetCurrentSnapshotNumber,
		GetSnapshot:                 GetSnapshot,
		CaptureInput:                CaptureInput
	}

	sys = sysinterface;
	com = cominterface;
	cm = clipmap.CreateInstance(sys);
	ui = uinterface.CreateInstance(sys, com, exports);
	cg = cgame.CreateInstance(sys, com, exports, cm, re, ui);

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
	InitRenderer();
	ui.Init();

	cls.initialized = true;
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
 * InitRenderer
 */
function InitRenderer() {
	re.Init(sys, com);
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

	// Send intentions now.
	SendCommand();

	// Resend a connection request if necessary.
	CheckForResend();

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
			throw new Error('Client command overflow');
		}
	}*/
	clc.reliableCommands[++clc.reliableSequence % MAX_RELIABLE_COMMANDS] = cmd;
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
			//port = Cvar_VariableValue ("net_qport");
			//Info_SetValueForKey(info, "protocol", va("%i", com_protocol->integer));
			//Info_SetValueForKey( info, "qport", va("%i", port ) );
			//Info_SetValueForKey( info, "challenge", va("%i", clc.challenge ) );
			var str = 'connect' + JSON.stringify(com.GetCvarKeyValues(CvarFlags.USERINFO));
			com.NetchanPrint(clc.netchan, str);
			// The most current userinfo has been sent, so watch for any
			// newer changes to userinfo variables.
			//cvar_modifiedFlags &= ~CVAR_USERINFO;
			break;

		default:
			throw new Error('CheckForResend: bad clc.state');
	}
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
		ConnectionlessPacket(addr, msg);
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
 * ConnectionlessPacket
 */
function ConnectionlessPacket(addr, msg) {
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