var SV;

var cl,
	cls,
	clc;

/**
 * log
 */
function log() {
	// Add to HUD events.
	// var menu_message = UI && UI.GetView('message');

	// if (menu_message) {
	// 	menu_message.addEvent({
	// 		type: 'print',
	// 		text: arguments[0]
	// 	});
	// }

	COM.Log.apply(this, arguments);
}

/**
 * error
 */
function error(str) {
	COM.Error(str);
}

/**
 * Init
 */
function Init(inSV) {
	log('Initializing');

	SV = inSV;

	cl = new ClientLocals();
	clc = new ClientConnection();
	if (!cls) {
		cls = new ClientStatic();
	}
	cls.realtime = 0;

	RegisterCvars();
	RegisterCommands();

	InitSubsystems();
}

/**
 * InitSubsystems
 */
function InitSubsystems() {
	async.parallel([
		RE.Init,
		SND.Init,
		UI.Init
	], function () {
		cls.initialized = true;
	});
}

/**
 * ShutdownSubsystems
 */
function ShutdownSubsystems() {
	async.parallel([
		RE.Shutdown,
		SND.Shutdown,
		UI.Shutdown,
	], function () {
		cls.initialized = false;
	});
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
	SND.Frame();
}

/**
 * ForwardCommandToServer
 *
 * Adds the current command line as a clientCommand.
 * Things like godmode, noclip, etc, are commands directed to the server,
 * so when they are typed in at the console, they will need to be forwarded.
 */
function ForwardCommandToServer(args) {
	if (clc.state < CA.CONNECTED) {
		return;
	}

	if (!args || !args.length) {
		return;
	}

	AddClientCommand(args[0], args.slice(1));

	return;
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
	if (Cvar.Modified(QS.CVAR.USERINFO)) {
		Cvar.ClearModified(QS.CVAR.USERINFO);
		AddClientCommand('userinfo', Cvar.GetCvarJSON(QS.CVAR.USERINFO));
	}
}

/**
 * CheckForResend
 *
 * Resend a connect message if the last one has timed out.
 */
function CheckForResend() {
	// Resend if we haven't gotten a reply yet.
	if (clc.state !== CA.CONNECTING && clc.state !== CA.CHALLENGING) {
		return;
	}

	if (cls.realTime - clc.connectTime < RETRANSMIT_TIMEOUT) {
		return;
	}

	log('CheckForResend', clc.state);

	clc.connectTime = cls.realTime;  // for retransmit requests
	clc.connectPacketCount++;

	//
	// Initialize the connection if needed.
	//
	if (!clc.netchan || !clc.netchan.ready) {
		ConnectToServer(clc.serverAddress);
		return;  // give it a second to connect
	}

	//
	// Send game-level connect request.
	//
	switch (clc.state) {
		// case CA.CONNECTING:
		// 	// The challenge request shall be followed by a client challenge so no malicious server can hijack this connection.
		// 	// Add the gamename so the server knows we're running the correct game or can reject the client
		// 	// with a meaningful message
		// 	Com_sprintf(data, sizeof(data), "getchallenge %d %s", clc.challenge, com_gamename->string);
		// 	NET_OutOfBandPrint(QS.NS_CLIENT, clc.serverAddress, "%s", data);
		// 	break;

		case CA.CHALLENGING:
			// Sending back the challenge.
			// Info_SetValueForKey(info, "protocol", va("%i", com_protocol->integer));
			// Info_SetValueForKey( info, "challenge", va("%i", clc.challenge ) );
			var str = 'connect ' + JSON.stringify(Cvar.GetCvarJSON(QS.CVAR.USERINFO));
			COM.NetchanPrint(clc.netchan, str);
			// The most current userinfo has been sent, so watch for any
			// newer changes to userinfo variables.
			Cvar.ClearModified(QS.CVAR.USERINFO);
			break;

		default:
			error('CheckForResend: bad clc.state');
			break;
	}
}

/**
 * ConnectToServer
 *
 * Connect to a server.
 */
function ConnectToServer(address) {
	if (clc.netchan && !clc.netchan.ready) {
		return;  // we're working on it
	}

	clc.netchan = COM.NetchanSetup(QS.NS.CLIENT, clc.serverAddress, {
		onmessage: function (buffer) {
			PacketEvent(buffer);
		},
		onclose: function (err) {
			error(err ? err : 'Disconnected from server');
		}
	});
}

/**
 * UpdateScreen
 */
function UpdateScreen() {
	// if (!cls.uiStarted) {
	// 	return;
	// }

	switch (clc.state) {
		case CA.DISCONNECTED:
			// Don't push a menu if one already exists.
			if (!UI.PeekMenu()) {
				var view_main = UI.GetView(UI.MainMenuModel);

				UI.PushMenu(view_main);
			}
			break;
		case CA.CONNECTING:
		case CA.CHALLENGING:
		case CA.CONNECTED:
		case CA.LOADING:
		case CA.PRIMED:
			UI.PopAllMenus();
			UI.RenderView(UI.GetView(UI.LoadingViewModel));
			break;
		case CA.ACTIVE:
			CG.Frame(cl.serverTime);
			break;
	}

	UI.Render();
}

/**
 * MapLoading
 *
 * A local server is starting to load a map.
 */
function MapLoading() {
	Disconnect();

	clc.serverAddress = COM.StringToAddr('localhost');
	clc.state = CA.CHALLENGING;  // so the connect screen is drawn
	clc.connectTime = -99999;
	CheckForResend();
}

/**
 * Disconnect
 *
 * Called when a connection, demo, or cinematic is being terminated.
 * Goes from a connected state to either a menu state or a console state,
 * sends a disconnect message to the server. This is also called on
 * COM.Error, so it shouldn't cause any errors.
 */
function Disconnect(showMainMenu) {
	if (clc.state === CA.DISCONNECTED) {
		return;
	}

	log('Disconnected from server');

	if (cls.uiStarted) {
		var menu_main = UI.GetView(UI.MainMenuModel);
		UI.PushMenu(menu_main);
	}

	// Send a disconnect message to the server.
	// Send it a few times in case one is dropped.
	if (clc.state >= CA.CONNECTED) {
		AddClientCommand('disconnect');
		WritePacket();
		// TCP/IP Enable for UDP.
		// WritePacket();
		// WritePacket();
	}

	// Wipe out the local client state.
	cl = new ClientLocals();

	// Wipe the client connection.
	clc = new ClientConnection();
	clc.state = CA.DISCONNECTED;
}


/**
 * AddClientCommand
 *
 * The given command will be transmitted to the server, and is gauranteed to
 * not have future usercmd_t executed before it is executed
*/
function AddClientCommand(type, data) {
	/*int unacknowledged = clc.reliableSequence - clc.reliableAcknowledge;

	// If we would be losing an old command that hasn't been acknowledged,
	// we must drop the connection, also leave one slot open for the
	// disconnect command in this case.
	if ((isDisconnectCmd && unacknowledged > COM.MAX_RELIABLE_COMMANDS) ||
	    (!isDisconnectCmd && unacknowledged >= COM.MAX_RELIABLE_COMMANDS))
	{
		if (com_errorEntered) {
			return;
		} else {
			error('Client command overflow');
		}
	}*/

	// Pass an empty object if undefined.
	if (typeof(data) === 'undefined') {
		data = {};
	}

	var cmd = { type: type, data: data };
	clc.reliableCommands[++clc.reliableSequence % COM.MAX_RELIABLE_COMMANDS] = cmd;
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

	if (!COM.NetchanProcess(clc.netchan, msg)) {
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
		if (clc.state !== CA.CHALLENGING) {
			console.warn('connectResponse packet while not connecting. Ignored.');
			return;
		}
		/*if ( !NET_CompareAdr( from, clc.serverAddress ) ) {
			Com_Printf( "connectResponse from wrong address. Ignored.\n" );
			return;
		}*/

		log('Got connection response');

		clc.state = CA.CONNECTED;
	}
}

/**
 * ClipmapExports
 */
function ClipmapExports() {
	return {
		log:   log,
		error: error
	};
}

/**
 * RendererExports
 */
function RendererExports() {
	return {
		SYS:   SYS,
		CL: {
			Log:    log,
			Error:  error,
			AddCmd: COM.AddCmd
		},
		CM:    CM
	};
}

/**
 * SoundExports
 */
function SoundExports() {
	return {
		SYS:   SYS,
		CL: {
			Log:   log,
			Error: error
		}
	};
}

/**
 * UIExports
 */
function UIExports() {
	return {
		SYS: SYS,
		CL: {
			Log:               log,
			Error:             error,
			ExecuteBuffer:     COM.ExecuteBuffer,
			GetKeyNamesForCmd: GetKeyNamesForCmd,
			CaptureInput:      CaptureInput,
			Disconnect:        Disconnect
		}
	};
}

/**
 * CGameExports
 */
function CGameExports() {
	return {
		SYS: SYS,
		CL: {
			Log:                      log,
			Error:                    error,
			AddCmd:                   COM.AddCmd,
			LoadBsp:                  COM.LoadBsp,
			LoadMap:                  COM.LoadMap,
			AddClientCommand:         AddClientCommand,
			GetGameState:             GetGameState,
			GetServerCommand:         GetServerCommand,
			GetCurrentUserCmdNumber:  GetCurrentUserCmdNumber,
			GetUserCmd:               GetUserCmd,
			SetUserCmdValue:          SetUserCmdValue,
			GetCurrentSnapshotNumber: GetCurrentSnapshotNumber,
			GetSnapshot:              GetSnapshot,
		},
		CM: CM,
		RE: RE,
		SND: SND,
		UI: UI
	};
}
