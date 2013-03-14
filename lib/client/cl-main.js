var cl,
	cls,
	clc,
	default_view,
	loading_model,
	loading_view;

var cl_name,
	cl_model,
	cl_sensitivity,
	cl_showTimeDelta,
	cl_timeNudge;

/**
 * log
 */
function log() {
	// // Add to console events.
	// if (message_model) {
	// 	message_model.addMessage(arguments[0]);
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
function Init(inSV, callback) {
	SV = inSV;

	cl = new ClientLocals();
	clc = new ClientConnection();
	if (!cls) {
		cls = new ClientStatic();
	}
	cls.realtime = 0;

	log('Initializing CL');

	RegisterCvars();
	RegisterCommands();

	// Wait for subsystems to initialize.
	InitSubsystems(function (err) {
		callback(err);
	});
}

/**
 * RegisterCvars
 */
function RegisterCvars() {
	cl_name          = Cvar.AddCvar('name',             DefaultName(),  Cvar.FLAGS.ARCHIVE | Cvar.FLAGS.USERINFO);
	cl_model         = Cvar.AddCvar('model',           'sarge',         Cvar.FLAGS.ARCHIVE | Cvar.FLAGS.USERINFO);
	cl_sensitivity   = Cvar.AddCvar('cl_sensitivity',   2,              Cvar.FLAGS.ARCHIVE);
	cl_showTimeDelta = Cvar.AddCvar('cl_showTimeDelta', 0,              Cvar.FLAGS.ARCHIVE);
	cl_timeNudge     = Cvar.AddCvar('cl_timeNudge',     0,              Cvar.FLAGS.ARCHIVE);
}

/**
 * InitSubsystems
 */
function InitSubsystems(callback) {
	cls.initialized = false;

	async.parallel([
		RE.Init,
		SND.Init,
		UI.Init
	], function (err) {
		if (err) {
			return callback(err);
		}

		cls.initialized = true;

		InitMenus();

		callback(null);
	});
}

/**
 * ShutdownSubsystems
 */
function ShutdownSubsystems(callback) {
	cls.initialized = false;

	async.parallel([
		RE.Shutdown,
		SND.Shutdown,
		UI.Shutdown,
	], function (err) {
		if (err) {
			return callback(err);
		}

		callback(null);
	});
}

/**
 * InitMenus
 */
function InitMenus() {
	default_view  = UI.CreateView(new UI.DefaultModel(), UI.DefaultTemplate);
	loading_model = new UI.LoadingModel();
	loading_view  = UI.CreateView(loading_model, UI.LoadingTemplate);
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
	if (Cvar.Modified(Cvar.FLAGS.USERINFO)) {
		Cvar.ClearModified(Cvar.FLAGS.USERINFO);
		AddClientCommand('userinfo', Cvar.GetCvarJSON(Cvar.FLAGS.USERINFO));
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

	clc.connectTime = cls.realTime;  // for retransmit requests
	clc.connectPacketCount++;

	//
	// Initialize the connection if needed.
	//
	if (!clc.netchan) {
		ConnectToServer(clc.serverAddress);
		return;  // give it a second to connect
	}

	//
	// Send game-level connect request.
	//
	switch (clc.state) {
		case CA.CONNECTING:
			clc.state = CA.CHALLENGING;
			// Skip this for now, perhaps we should use WebSockets w/ TLS.
			// 	// The challenge request shall be followed by a client challenge so no malicious server can hijack this connection.
			// 	// Add the gamename so the server knows we're running the correct game or can reject the client
			// 	// with a meaningful message
			// 	vat str = 'getchallenge ' + clc.challenge;// com_gamename->string
			// 	COM.NetchanPrint(clc.netchan, str);
			break;

		case CA.CHALLENGING:
			var com_protocol = Cvar.AddCvar('com_protocol');

			// Sending back the challenge.
			var data = {};

			data.userinfo = Cvar.GetCvarJSON(Cvar.FLAGS.USERINFO);
			data.protocol = com_protocol.get();

			COM.NetchanOutOfBandPrint(clc.netchan, 'connect', data);

			// The most current userinfo has been sent, so watch for any
			// newer changes to userinfo variables.
			Cvar.ClearModified(Cvar.FLAGS.USERINFO);
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
var pending = false;
function ConnectToServer(address) {
	if (clc.netchan || pending) {
		return;  // we're working on it
	}

	pending = true;

	var socket = COM.NetConnect(clc.serverAddress, {
		onopen: function () {
			pending = false;

			clc.netchan = COM.NetchanSetup(socket);
		},
		onmessage: function (buffer) {
			pending = false;

			PacketEvent(buffer);
		},
		onclose: function () {
			pending = false;

			if (clc.state === CA.DISCONNECTED) {
				// This was an intentional disconnect.
				return;
			}

			if (clc.state === CA.CONNECTING) {
				error('Failed to connect to server.');
			} else {
				error('Disconnected from server.')
			}
		}
	});
}

/**
 * UpdateScreen
 */
function UpdateScreen() {
	switch (clc.state) {
		case CA.DISCONNECTED:
			UI.SetActiveMenu(null);
			UI.RenderView(default_view);
			break;
		case CA.CONNECTING:
		case CA.CHALLENGING:
		case CA.CONNECTED:
		case CA.LOADING:
		case CA.PRIMED:
			var address = clc.serverAddress.ip;
			if (clc.serverAddress.port) {
				address += ':' + clc.serverAddress.port;
			}
			loading_model.address(address);
			UI.RenderView(loading_view);
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
	CmdConnect('localhost');
}

/**
 * Disconnect
 *
 * Called when a connection, demo, or cinematic is being terminated.
 * Goes from a connected state to either a menu state or a console state,
 * sends a disconnect message to the server. This is also called on
 * COM.Error, so it shouldn't cause any errors.
 */
function Disconnect() {
	if (clc.state === CA.DISCONNECTED) {
		return;
	}

	log('Disconnected from server.');

	// TCP/IP Enable for UDP.
	// // Send a disconnect message to the server.
	// // Send it a few times in case one is dropped.
	// if (clc.state >= CA.CONNECTED) {
	// 	AddClientCommand('disconnect');
	// 	WritePacket();
	// 	WritePacket();
	// 	WritePacket();
	// }

	var netchan = clc.netchan;

	// Wipe out the local client state.
	cl = new ClientLocals();

	// Wipe the client connection.
	clc = new ClientConnection();
	clc.state = CA.DISCONNECTED;

	// Kill the socket for TCP/IP.
	// We do this after we change the clc.state so we
	// don't get stuck in a loop on loopback servers.
	if (netchan) {
		COM.NetClose(netchan.socket);
	}
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
function PacketEvent(source) {
	if (!cls.initialized) {
		return;
	}

	// source may be either an ArrayBuffer, or an ArrayBufferView
	// in the case of loopback packets.
	var buffer, length;

	if (source.buffer) {
		buffer = source.buffer;
		length = source.length;
	} else {
		buffer = source;
		length = source.byteLength;
	}

	var msg = new BitStream(buffer, 0, length);

	// Peek in and see if this is a string message.
	if (msg.view.getInt32(0) === -1) {
		OutOfBoundPacket(msg);
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
 * OutOfBoundPacket
 */
function OutOfBoundPacket(msg) {
	msg.readInt32();  // Skip the -1.

	var str = msg.readASCIIString();
	var message;

	try {
		message = JSON.parse(str);
	} catch (e) {
		error(e);
		return;
	}

	var cmd = message.type;

	if (cmd === 'print') {
		// TODO display on loading screen
		// clc.serverMessage = message.data;
		log(message.data);
	} else if (cmd === 'connectResponse') {
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

		clc.state = CA.CONNECTED;
	}
}

/**
 * DefaultName
 */
function DefaultName() {
	var prefixes,
		suffixes;

	prefixes = [
		'Unnamed',
		'Nut',
		'Fuck',
		'Fail',
		'Magic',
		'SonicThe',
		'Lame',
		'Porn',
		'Bearded',
		'Cold',
		'Tattooed',
		'Pigtailed',
		'Thick',
		'Musty',
		'Ugly',
		'Disgusting',
		'Fake',
		'Shirtless',
		'Murder',
		'Cool',
		'Awesome',
		'Drunken',
		'Space',
		'Young',
		'Black',
		'Terror',
		'Celebrity',
		'Dead',
		'Weird',
		'Hug',
		'White',
		'Floating',
		'Blood',
		'SelfTaught',
		'Wrong',
		'Locked',
		'Average',
		'Disappearing',
		'Laugh',
		'Moist',
		'Pink',
		'Super',
		'Half',
		'Bound',
		'Street',
		'Cave',
		'Metal',
		'Solid',
		'Shadow',
		'Doom',
		'Lost',
		'Heavenly',
		'Secret',
		'Monster',
		'Total',
		'Game',
		'Meat',
		'NobyNoby',
		'Dust',
		'Enemy',
		'Walking',
		'Mega'
	];

	suffixes = [
		'Player',
		'Case',
		'Face',
		'Whale',
		'Mike',
		'Hedgehog',
		'Guest',
		'Star',
		'Lady',
		'Clown',
		'Junk',
		'Kitchen',
		'City',
		'Symptom',
		'Sickness',
		'Bitches',
		'Truck',
		'Bag',
		'Lion',
		'Gopher',
		'Beans',
		'Sauce',
		'Robot',
		'Frog',
		'Fractions',
		'Chemistry',
		'Lung',
		'SmokeStacks',
		'Attack',
		'Jar',
		'Nihilist',
		'Anarchist',
		'Door',
		'Lightning',
		'Citizen',
		'Hooligan',
		'Whiskey',
		'Club',
		'Cocktail',
		'Friend',
		'Bassline',
		'Rhymes',
		'Kite',
		'Soldier',
		'King',
		'Beast',
		'Script',
		'Peer',
		'Light',
		'World',
		'Mario',
		'Life',
		'Mother',
		'Earth',
		'Man',
		'Champion',
		'Gear',
		'War',
		'Fighter',
		'Story',
		'Trigger',
		'Snake',
		'Eater',
		'Colossus',
		'Prime',
		'Viking',
		'Quest',
		'Hand',
		'Bride',
		'Hunter',
		'Spartan',
		'Warrior',
		'Boy',
		'Wrath',
		'Ninja',
		'Man'
	];

	return prefixes[Math.floor(Math.random() * prefixes.length)] + suffixes[Math.floor(Math.random() * suffixes.length)];
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
			ExecuteBuffer:            COM.ExecuteBuffer,
			LoadBsp:                  COM.LoadBsp,
			LoadMap:                  COM.LoadMap,
			GetKeyNamesForCmd:        GetKeyNamesForCmd,
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