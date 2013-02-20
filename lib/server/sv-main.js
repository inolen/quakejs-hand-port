var sv,
	svs,
	dedicated;

var sv_port,
	sv_rconPort,
	sv_master,
	sv_serverid,
	sv_hostname,
	sv_mapname,
	sv_maxClients,
	sv_fps,
	sv_timeout,
	sv_zombietime;

/**
 * log
 */
function log() {
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
 *
 * Called only once on startup.
 */
function Init(inCL) {
	log('Initializing');

	CL = inCL;

	sv = new ServerLocals();
	if (!svs) {
		svs = new ServerStatic();
	}

	dedicated = !CL;

	RegisterCvars();
	RegisterCommands();

	CreateListenServer();
	CreateRemoteConsole();
}

/**
 * RegisterCvars
 */
function RegisterCvars() {
	sv_port       = Cvar.AddCvar('sv_port',       9001,                         QS.CVAR.ARCHIVE, true);
	sv_rconPort   = Cvar.AddCvar('sv_rconPort',   9002,                         QS.CVAR.ARCHIVE, true);
	sv_master     = Cvar.AddCvar('sv_master',     'master.quakejs.com:45735',   QS.CVAR.ARCHIVE);
	sv_hostname   = Cvar.AddCvar('sv_hostname',   'Anonymous',                  QS.CVAR.ARCHIVE);
	sv_serverid   = Cvar.AddCvar('sv_serverid',   0,                            QS.CVAR.SYSTEMINFO | QS.CVAR.ROM);
	sv_mapname    = Cvar.AddCvar('sv_mapname',    'nomap',                      QS.CVAR.SERVERINFO);
	sv_maxClients = Cvar.AddCvar('sv_maxClients', 8,                            QS.CVAR.SERVERINFO | QS.CVAR.LATCH | QS.CVAR.ARCHIVE);
	sv_fps        = Cvar.AddCvar('sv_fps',        20);   // time rate for running non-clients
	sv_timeout    = Cvar.AddCvar('sv_timeout',    200);  // seconds without any message
	sv_zombietime = Cvar.AddCvar('sv_zombietime', 2);    // seconds to sink messages after disconnect
}

/**
 * CreateListenServer
 */
function CreateListenServer() {
	// For non dedicated servers, setup a bogus netchan
	// to be used as the loopback handler.
	if (!dedicated) {
		var addr = COM.StringToAddr('localhost');
		var loopback = COM.NetchanSetup(QS.NS.SERVER, addr, {
			onmessage: function (buffer) {
				PacketEvent(loopback, buffer);
			}
		});
		return;
	}

	SYS.NetListen(sv_port.get(), {
		onrequest: ClientRequest,
		onaccept: ClientAccept
	});
}

/**
 * CreateRemoteConsole
 */
function CreateRemoteConsole() {
	if (!dedicated) {
		return;
	}

	SYS.CreateRemoteConsole(sv_rconPort.get());
}

/**
 * FrameMsec
 *
 * Calculate the # of milliseconds for a single frame.
 */
function FrameMsec() {
	var fps = sv_fps.get();
	var frameMsec = 1000 / fps;

	if (frameMsec < 1) {
		frameMsec = 1;
	}

	return frameMsec;
}

/**
 * Frame
 */
function Frame(msec) {
	if (!Running()) {
		return;
	}

	var frameMsec = FrameMsec();
	sv.timeResidual += msec;

	// Restart if the delay is up.
	if (sv.restartTime && sv.time >= sv.restartTime) {
		sv.restartTime = 0;
		COM.ExecuteBuffer('map_restart 0');
		return;
	}

	// Update infostrings if anything has been changed.
	if (Cvar.Modified(QS.CVAR.SERVERINFO)) {
		SetConfigstring('serverInfo', Cvar.GetCvarJSON(QS.CVAR.SERVERINFO));
		Cvar.ClearModified(QS.CVAR.SERVERINFO);
	}
	if (Cvar.Modified(QS.CVAR.SYSTEMINFO)) {
		SetConfigstring('systemInfo', Cvar.GetCvarJSON(QS.CVAR.SYSTEMINFO));
		Cvar.ClearModified(QS.CVAR.SYSTEMINFO);
	}

	// Update ping based on the all received frames.
	CalcPings();

	// Run the game simulation in chunks.
	var frames = 0;
	while (sv.timeResidual >= frameMsec) {
		sv.timeResidual -= frameMsec;
		svs.time += frameMsec;
		sv.time += frameMsec;

		// Let everything in the world think and move.
		GM.Frame(sv.time);
		frames++;
	}

	// Check for timeouts.
	CheckTimeouts();

	// Don't send out duplicate snapshots if we didn't run any gameframes.
	if (frames > 0) {
		SendClientMessages();
	}

	// Send a heartbeat to the master if needed.
	SendMasterHeartbeat();
}

/**
 * Running
 */
function Running() {
	return svs.initialized;
}

/**
 * CalcPings
 *
 * Updates the cl->ping variables
 */
function CalcPings() {
	for (var i = 0; i < sv_maxClients.get(); i++) {
		var client = svs.clients[i];

		if (client.state !== CS.ACTIVE) {
			client.ping = 999;
			continue;
		}

		if (!client.gentity) {
			client.ping = 999;
			continue;
		}

		var total = 0;
		var count = 0;
		for (var j = 0; j < COM.PACKET_BACKUP; j++) {
			if (client.frames[j].messageAcked <= 0) {
				continue;
			}
			var delta = client.frames[j].messageAcked - client.frames[j].messageSent;
			total += delta;
			count++;
		}
		if (!count) {
			client.ping = 999;
		} else {
			client.ping = Math.floor(total / count);
			if (client.ping > 999) {
				client.ping = 999;
			}
		}

		// Let the game dll know about the ping.
		var ps = GM.GetClientPlayerstate(i);
		ps.ping = client.ping;
	}
}

/**
 * CheckTimeouts
 *
 * If a packet has not been received from a client for timeout->integer
 * seconds, drop the conneciton. Server time is used instead of
 * realtime to avoid dropping the local client while debugging.
 *
 * When a client is normally dropped, the client_t goes into a zombie state
 * for a few seconds to make sure any final reliable message gets resent
 * if necessary
 */
function CheckTimeouts() {
	var droppoint = svs.time - 1000 * sv_timeout.get();
	var zombiepoint = svs.time - 1000 * sv_zombietime.get();

	for (var i = 0; i < sv_maxClients.get(); i++) {
		var client = svs.clients[i];
		if (client.state === CS.FREE) {
			continue;
		}

		// Message times may be wrong across a changelevel.
		if (client.lastPacketTime > svs.time) {
			client.lastPacketTime = svs.time;
		}

		if (client.state === CS.ZOMBIE && client.lastPacketTime < zombiepoint) {
			log('Going from CS_ZOMBIE to CS_FREE for client', i);
			client.state = CS.FREE;  // can now be reused
			continue;
		}

		if (client.state >= CS.CONNECTED && client.lastPacketTime < droppoint) {
			DropClient(client, 'timed out');
			client.state = CS.FREE;  // don't bother with zombie state
		}
	}
}

/**
 * SendMasterHeartbeat
 *
 * Send a message to the masters every few minutes to
 * let it know we are alive, and log information.
 * We will also have a heartbeat sent when a server
 * changes from empty to non-empty, and full to non-full,
 * but not on every player enter or exit.
 */
var HEARTBEAT_MSEC = 30 * 1000;

function SendMasterHeartbeat() {
	// Only dedicated servers send heart beats.
	if (!dedicated) {
		return;
	}

	// If not time yet, don't send anything.
	if (svs.time < svs.nextHeartbeatTime) {
		return;
	}

	svs.nextHeartbeatTime = svs.time + HEARTBEAT_MSEC;

	//
	log('SendMasterHeartbeat');

	var addr = COM.StringToAddr(sv_master.get());
	var netchan = COM.NetchanSetup(QS.NS.SERVER, addr, {
		onopen: function () {
			var msg = {
				type: 'heartbeat',
				port: sv_port.get()
			};

			COM.NetchanPrint(netchan, JSON.stringify(msg));
			COM.NetchanDestroy(netchan);
		}
	});
}

/**
 * PacketEvent
 */
function PacketEvent(netchan, source) {
	if (!Running()) {
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
		ConnectionlessPacket(netchan, msg);
		return;
	}

	for (var i = 0; i < svs.clients.length; i++) {
		var client = svs.clients[i];

		if (client.state === CS.FREE) {
			continue;
		}

		if (client.netchan !== netchan) {
			continue;
		}

		if (COM.NetchanProcess(client, msg)) {
			client.lastPacketTime = svs.time;  // don't timeout
			ExecuteClientMessage(client, msg);
		}
		return;
	}
}

/**
 * ConnectionlessPacket
 *
 * This is silly being that we're on TCP/IP.
 */
function ConnectionlessPacket(netchan, msg) {
	msg.readInt32();  // Skip the -1.

	var str = msg.readASCIIString();

	if (str.indexOf('connect') === 0) {
		ClientEnterServer(netchan, str.substr(8));
	} else if (str.indexOf('getinfo') === 0) {
		ServerInfo(netchan);
	}
}

/**
 * ServerInfo
 */
function ServerInfo(netchan) {
	var info = {};

	var g_gametype = Cvar.AddCvar('g_gametype');

	// Info_SetValueForKey( infostring, "gamename", com_gamename->string );
	// Info_SetValueForKey(infostring, "protocol", va("%i", com_protocol->integer));

	info.sv_hostname = sv_hostname.get();
	info.sv_mapname = sv_mapname.get();
	info.sv_maxClients = sv_maxClients.get();
	info.g_gametype = g_gametype.get();

	var count = 0;
	for (var i = 0; i < sv_maxClients.get(); i++) {
		if (svs.clients[i].state >= CS.CONNECTED) {
			count++;
		}
	}

	info.clients = count;

	COM.NetchanPrint(netchan, JSON.stringify(info));
}

/**
 * Spawn
 */
function Spawn(mapName) {
	log('Spawning new server for', mapName, 'at', COM.frameTime);

	svs.initialized = false;

	// Shutdown the game.
	ShutdownGame();

	// If there is a local client, inform it we're changing maps.
	if (!dedicated) {
		// Update the local client's screen.
		CL.MapLoading();

		// Make sure all the client stuff is unloaded.
		CL.ShutdownSubsystems();
		CL.ShutdownCGame();

		// Restart renderer and sound systems.
		CL.InitSubsystems();
	}

	// Toggle the server bit so clients can detect that a server has changed.
	svs.snapFlagServerBit ^= QS.SNAPFLAG_SERVERCOUNT;

	// Wipe the entire per-level structure.
	var oldServerTime = sv.time;
	sv = new ServerLocals();

	// Load the map data.
	COM.LoadBsp(mapName, function (err, world) {
		if (err) {
			return error(err);
		}

		// Save off to pass game entity info.
		sv.world = world;

		// Load the collision info.
		CM.LoadWorld(world);

		sv_mapname.set(mapName);

		// Server id should be different each time.
		sv.serverId = sv.restartedServerId = COM.frameTime;
		sv_serverid.set(sv.serverId);

		// Clear physics interaction links.
		ClearWorld();

		// Media configstring setting should be done during
		// the loading stage, so connected clients don't have
		// to load during actual gameplay.
		sv.state = SS.LOADING;

		// Initialize the game.
		InitGame();

		// Run a few frames to allow everything to settle.
		for (var i = 0; i < 3; i++) {
			GM.Frame(sv.time);
			sv.time += 100;
			svs.time += 100;
		}

		CreateBaselines();

		// Send the new gamestate to all connected clients.
		for (var i = 0; i < sv_maxClients.get(); i++) {
			var client = svs.clients[i];

			if (!client || client.state < CS.CONNECTED) {
				continue;
			}

			// Clear gentity pointer to prevent bad snapshots from building.
			client.gentity = null;

			// Reconnect.
			var denied = GM.ClientConnect(i, false);

			if (denied) {
				DropClient(client, denied);
			}

			// When we get the next packet from a connected client,
			// the new gamestate will be sent.
			client.state = CS.CONNECTED;
		}

		// Run another frame to allow things to look at all the players.
		GM.Frame(sv.time);
		sv.time += 100;
		svs.time += 100;

		SetConfigstring('systemInfo', Cvar.GetCvarJSON(QS.CVAR.SYSTEMINFO));
		SetConfigstring('serverInfo', Cvar.GetCvarJSON(QS.CVAR.SERVERINFO));

		// Any media configstring setting now should issue a warning
		// and any configstring changes should be reliably transmitted
		// to all clients.
		sv.state = SS.GAME;

		svs.initialized = true;
	});
}

/**
 * Kill
 *
 * Called by the client when it wants to kill the local server.
 */
function Kill() {
	log('KillServer');

	// Shutdown the game.
	ShutdownGame();

	// Free the current level.
	sv = new ServerLocals();
	svs = new ServerStatic();

	// Disconnect any local clients.
	// if( sv_killserver->integer != 2)
	// 	CL_Disconnect( qfalse );
}

/**
 * CreateBaselines
 *
 * Entity baselines are used to compress non-delta messages
 * to the clients -- only the fields that differ from the
 * baseline will be transmitted.
 */
function CreateBaselines() {
	for (var i = 0; i < QS.MAX_GENTITIES; i++) {
		var svent = sv.svEntities[i];
		var gent = GentityForSvEntity(svent);
		if (!gent.r.linked) {
			continue;
		}

		// Take current state as baseline.
		gent.s.clone(sv.svEntities[i].baseline);
	}
}

/**
 * GetConfigstring
 */
function GetConfigstring(key) {
	var json = sv.configstrings[key];
	var ret = json ? JSON.parse(json) : null;
	return ret;
}

/**
 * SetConfigstring
 */
function SetConfigstring(key, val) {
	var json = JSON.stringify(val);

	// Don't bother broadcasting an update if no change.
	if (json === sv.configstrings[key]) {
		return;
	}

	// Change the string.
	sv.configstrings[key] = json;

	// Send it to all the clients if we aren't spawning a new server.
	if (sv.state === SS.GAME || sv.restarting) {
		// Send the data to all relevent clients.
		for (var i = 0; i < sv_maxClients.get(); i++) {
			var client = svs.clients[i];

			if (client.state < CS.ACTIVE) {
				if (client.state === CS.PRIMED) {
					client.csUpdated[key] = true;
				}
				continue;
			}

			SendConfigstring(client, key);
		}
	}
}

/**
 * SendConfigString
 *
 * Creates and sends the server command necessary to update the CS index for the
 * given client.
 */
function SendConfigstring(client, key) {
	var json = sv.configstrings[key];
	SendServerCommand(client, 'cs', { k: key, v: JSON.parse(json) });
}

/**
 * UpdateConfigstrings
 *
 * Called when a client goes from CS.PRIMED to CS.ACTIVE. Updates all
 * Configstring indexes that have changed while the client was in CS.PRIMED.
 */
function UpdateConfigstrings(client) {
	for (var key in sv.configstrings) {
		if (!sv.configstrings.hasOwnProperty(key)) {
			continue;
		}

		// If the CS hasn't changed since we went to CS.PRIMED, ignore.
		if (!client.csUpdated[key]) {
			continue;
		}

		SendConfigstring(client, key);
		client.csUpdated[key] = false;
	}
}

/**
 * GetUserinfo
 */
function GetUserinfo(clientNum) {
	if (clientNum < 0 || clientNum >= QS.MAX_CLIENTS) {
		error('GetUserinfo: bad index ' + clientNum);
	}

	return svs.clients[clientNum].userinfo;
}

/**********************************************************
 *
 * Event messages
 *
 **********************************************************/

/**
 * SendServerCommand
 *
 * Sends a reliable command string to be interpreted by
 * the client game module: "cp", "print", "chat", etc
 * A NULL client will broadcast to all clients
 */
function SendServerCommand(client, type, data) {
	if (client !== null) {
		AddServerCommand(client, type, data);
		return;
	}

	// // Hack to echo broadcast prints to console.
	// if ( com_dedicated->integer && !strncmp( (char *)message, "print", 5) ) {
	// 	Com_Printf ("broadcast: %s\n", SV_ExpandNewlines((char *)message) );
	// }

	// Send the data to all relevent clients.
	for (var i = 0; i < sv_maxClients.get(); i++) {
		AddServerCommand(svs.clients[i], type, data);
	}
}

/**
 * AddServerCommand
 *
 * The given command will be transmitted to the client, and is guaranteed to
 * not have future snapshot_t executed before it is executed.
 */
function AddServerCommand(client, type, data) {
	// Do not send commands until the gamestate has been sent.
	if (client.state < CS.PRIMED) {
		return;
	}

	client.reliableSequence++;

	var cmd = { type: type, data: data };

	// If we would be losing an old command that hasn't been acknowledged,
	// we must drop the connection.
	// We check == instead of >= so a broadcast print added by SV_DropClient()
	// doesn't cause a recursive drop client.
	if (client.reliableSequence - client.reliableAcknowledge === COM.MAX_RELIABLE_COMMANDS + 1 ) {
		log('----- pending server commands -----');
		for (var i = client.reliableAcknowledge + 1; i <= client.reliableSequence; i++) {
			log('cmd', i, client.reliableCommands[i % COM.MAX_RELIABLE_COMMANDS]);
		}
		log('cmd', i, cmd);
		DropClient(client, 'Server command overflow');
		return;
	}

	// Copy the command off.
	client.reliableCommands[client.reliableSequence % COM.MAX_RELIABLE_COMMANDS] = cmd;
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
 * GameExports
 */
function GameExports() {
	return {
		SYS: SYS,
		COM: {
			ExecuteBuffer: COM.ExecuteBuffer,
			AddCmd:        COM.AddCmd
		},
		SV: {
			Log:                   log,
			Error:                 error,
			LocateGameData:        LocateGameData,
			GetUserCmd:            GetUserCmd,
			AdjustAreaPortalState: AdjustAreaPortalState,
			EntityContact:         EntityContact,
			GetConfigstring:       GetConfigstring,
			SetConfigstring:       SetConfigstring,
			GetUserinfo:           GetUserinfo,
			SendServerCommand:     SendGameServerCommand,
			SetBrushModel:         SetBrushModel,
			GetEntityDefs:         GetEntityDefs,
			LinkEntity:            LinkEntity,
			UnlinkEntity:          UnlinkEntity,
			FindEntitiesInBox:     FindEntitiesInBox,
			Trace:                 Trace,
			PointContents:         PointContents
		}
	};
}
