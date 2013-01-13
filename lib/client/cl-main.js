var sv;

var cl,
	cls,
	clc;

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
function Init(inSv) {
	log('Initializing');

	sv = inSv;

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
		re.Init,
		snd.Init,
		ui.Init
	], function () {
		cls.initialized = true;
	});
}

/**
 * ShutdownSubsystems
 */
function ShutdownSubsystems() {
	async.parallel([
		re.Shutdown,
		snd.Shutdown,
		ui.Shutdown,
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
	snd.Frame();
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
	if (com.cvarModifiedFlags & CVF.USERINFO) {
		com.cvarModifiedFlags &= ~CVF.USERINFO;
		AddClientCommand('userinfo', com.GetCvarValues(CVF.USERINFO));
	}
}

/**
 * CheckForResend
 *
 * Resend a connect message if the last one has timed out.
 * This should never be called more than once due to the fact
 * that we're on TCP / IP.
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
		// 	NET_OutOfBandPrint(NS_CLIENT, clc.serverAddress, "%s", data);
		// 	break;

		case CA.CHALLENGING:
			// Sending back the challenge.
			// Info_SetValueForKey(info, "protocol", va("%i", com_protocol->integer));
			// Info_SetValueForKey( info, "challenge", va("%i", clc.challenge ) );
			var str = 'connect ' + JSON.stringify(com.GetCvarValues(CVF.USERINFO));
			com.NetchanPrint(clc.netchan, str);
			// The most current userinfo has been sent, so watch for any
			// newer changes to userinfo variables.
			com.cvarModifiedFlags &= ~CVF.USERINFO;
			break;

		default:
			com.Error('CheckForResend: bad clc.state');
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

	clc.netchan = com.NetchanSetup(NS.CLIENT, clc.serverAddress, {
		onmessage: function (buffer) {
			PacketEvent(buffer);
		},
		onclose: function (err) {
			com.Error(err ? err : 'Disconnected from server');
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
			if (!ui.PeekMenu()) {
				var view_main = ui.GetView('main');

				view_main.setConnected(false);
				ui.PushMenu(view_main);
			}
			break;
		case CA.CONNECTING:
		case CA.CHALLENGING:
		case CA.CONNECTED:
		case CA.LOADING:
		case CA.PRIMED:
			ui.PopAllMenus();
			ui.RenderView(ui.GetView('loading'));
			break;
		case CA.ACTIVE:
			cg.Frame(cl.serverTime);
			break;
	}

	ui.Render();
}

/**
 * MapLoading
 *
 * A local server is starting to load a map.
 */
function MapLoading() {
	Disconnect();

	clc.serverAddress = com.StringToAddr('localhost');
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
 * com.Error, so it shouldn't cause any errors.
 */
function Disconnect(showMainMenu) {
	if (clc.state === CA.DISCONNECTED) {
		return;
	}

	log('Disconnected from server');

	if (cls.uiStarted) {
		ui.PushMenu('main');
	}

	// Send a disconnect message to the server.
	// Send it a few times in case one is dropped.
	if (clc.state >= CA.CONNECTED) {
		AddClientCommand('disconnect');
		WritePacket();
		// We're on TCP/IP doesn't matter.
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
	if ((isDisconnectCmd && unacknowledged > MAX_RELIABLE_COMMANDS) ||
	    (!isDisconnectCmd && unacknowledged >= MAX_RELIABLE_COMMANDS))
	{
		if (com_errorEntered) {
			return;
		} else {
			com.Error('Client command overflow');
		}
	}*/

	// Pass an empty object if undefined.
	if (typeof(data) === 'undefined') {
		data = {};
	}

	var cmd = { type: type, data: data };
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
		sys: sys,
		com: {
			Error: com.Error
		}
	};
}

/**
 * RendererExports
 */
function RendererExports() {
	return {
		sys: sys,
		com: {
			Error:   com.Error,
			AddCvar: com.AddCvar,
			AddCmd:  com.AddCmd
		},
		cm: {
			EmitCollisionSurfaces: cm.EmitCollisionSurfaces
		}
	};
}

/**
 * SoundExports
 */
function SoundExports() {
	return {
		sys: sys,
		com: {
			Error:   com.Error,
			AddCvar: com.AddCvar
		}
	};
}

/**
 * UIExports
 */
function UIExports() {
	return {
		sys: sys,
		com: {
			Error:         com.Error,
			GetCvarVal:    com.GetCvarVal,
			SetCvarVal:    com.SetCvarVal,
			LoadConfig:    com.LoadConfig,
			SaveConfig:    com.SaveConfig,
			ExecuteBuffer: com.ExecuteBuffer
		},
		cl: {
			Bind:              CmdBind,
			UnbindAll:         CmdUnbindAll,
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
		sys: sys,
		com: {
			Error:   com.Error,
			AddCmd:  com.AddCmd,
			AddCvar: com.AddCvar
		},
		cl: {
			LoadBsp:                  com.LoadBsp,
			LoadMap:                  com.LoadMap,
			AddClientCommand:         AddClientCommand,
			GetGameState:             GetGameState,
			GetServerCommand:         GetServerCommand,
			GetCurrentUserCmdNumber:  GetCurrentUserCmdNumber,
			GetUserCmd:               GetUserCmd,
			SetUserCmdValue:          SetUserCmdValue,
			GetCurrentSnapshotNumber: GetCurrentSnapshotNumber,
			GetSnapshot:              GetSnapshot,
		},
		cm: {
			LoadWorld:                cm.LoadWorld,
			InlineModel:              cm.InlineModel,
			TempBoxModel:             cm.TempBoxModel,
			TransformedBoxTrace:      cm.TransformedBoxTrace,
			BoxTrace:                 cm.BoxTrace,
			PointContents:            cm.PointContents,
			TransformedPointContents: cm.TransformedPointContents
		},
		re: {
			RT:                       re.RT,
			RF:                       re.RF,
			RDF:                      re.RDF,

			RefDef:                   re.RefDef,
			RefEntity:                re.RefEntity,
			PolyVert:                 re.PolyVert,

			LoadWorld:                re.LoadWorld,
			NumInlineModels:          re.NumInlineModels,
			RegisterShader:           re.RegisterShader,
			RegisterModel:            re.RegisterModel,
			RegisterSkin:             re.RegisterSkin,
			AddRefEntityToScene:      re.AddRefEntityToScene,
			AddLightToScene:          re.AddLightToScene,
			LerpTag:                  re.LerpTag,
			ModelBounds:              re.ModelBounds,
			RenderScene:              re.RenderScene,
			GetCounts:                re.GetCounts,
			BuildCollisionBuffers:    re.BuildCollisionBuffers,
			MarkFragments:            re.MarkFragments
		},
		snd: {
			RegisterSound:           snd.RegisterSound,
			StartSound:              snd.StartSound,
			StartLocalSound:         snd.StartLocalSound,
			StartBackgroundTrack:    snd.StartBackgroundTrack,
			Respatialize:            snd.Respatialize,
			UpdateEntityPosition:    snd.UpdateEntityPosition
		},
		ui: {
			RegisterImage:            ui.RegisterImage,
			GetView:                  ui.GetView,
			RenderView:               ui.RenderView,
			Render:                   ui.Render
		}
	};
}