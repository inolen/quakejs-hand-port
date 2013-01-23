var cl;

var sv,
	svs;

var dedicated;

/**
 * log
 */
function log() {
	var args = Array.prototype.slice.call(arguments);
	args.splice(0, 0, 'SV:');
	Function.apply.call(console.log, console, args);
}

/**
 * Init
 *
 * Called only once on startup.
 */
function Init(inCl, gamePort) {
	log('Initializing');

	cl = inCl;

	sv = new ServerLocals();
	if (!svs) {
		svs = new ServerStatic();
	}

	dedicated = !cl;

	RegisterCvars();
	RegisterCommands();
	CreateListenServer(gamePort);
}

/**
 * CreateListenServer
 */
function CreateListenServer(gamePort) {
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

	SYS.NetListen(gamePort, {
		onrequest: ClientRequest,
		onaccept: ClientAccept
	});
}

/**
 * FrameMsec
 *
 * Calculate the # of milliseconds for a single frame.
 */
function FrameMsec() {
	var fps = sv_fps();
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
	if (COM.cvarModifiedFlags & QS.CVF.SERVERINFO) {
		SetConfigstring('serverInfo', COM.GetCvarValues(QS.CVF.SERVERINFO));
		COM.cvarModifiedFlags &= ~QS.CVF.SERVERINFO;
	}
	if (COM.cvarModifiedFlags & QS.CVF.SYSTEMINFO ) {
		SetConfigstring('systemInfo', COM.GetCvarValues(QS.CVF.SYSTEMINFO));
		COM.cvarModifiedFlags &= ~QS.CVF.SYSTEMINFO;
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
	for (var i = 0; i < sv_maxClients(); i++) {
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
	var droppoint = svs.time - 1000 * sv_timeout();
	var zombiepoint = svs.time - 1000 * sv_zombietime();

	for (var i = 0; i < sv_maxClients(); i++) {
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
var HEARTBEAT_MSEC = 300*1000;

function SendMasterHeartbeat() {
	return;
	// Only dedicated servers send heart beats.
	// if (!dedicated) {
	// 	return;
	// }

	// If not time yet, don't send anything.
	if (svs.time < svs.nextHeartbeatTime) {
		return;
	}

	svs.nextHeartbeatTime = svs.time + HEARTBEAT_MSEC;

	//
	var addr = COM.StringToAddr('127.0.0.1:9003');
	var netchan = COM.NetchanSetup(QS.NS.SERVER, addr);
	console.log('SendMasterHeartbeat');
	netchan.onopen = function () {
		console.log('SendMasterHeartbeat onopen');
		COM.NetchanPrint(netchan, 'foobar');
		COM.NetchanDestroy(netchan);
	};
}

/**
 * PacketEvent
 */
function PacketEvent(netchan, buffer) {
	if (!Running()) {
		return;
	}

	var msg = new ByteBuffer(buffer, ByteBuffer.LITTLE_ENDIAN);

	// Peek in and see if this is a string message.
	if (buffer.byteLength > 4 && msg.view.getInt32(0, !!ByteBuffer.LITTLE_ENDIAN) === -1) {
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
	msg.readInt();  // Skip the -1.

	var str = msg.readCString();

	if (str.indexOf('connect') === 0) {
		ClientEnterServer(netchan, str.substr(8));
	}
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
		cl.MapLoading();

		// Make sure all the client stuff is unloaded.
		cl.ShutdownSubsystems();
		cl.ShutdownCGame();

		// Restart renderer and sound systems.
		cl.InitSubsystems();
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

		sv_mapname(mapName);
		// serverid should be different each time.
		sv.serverId = sv.restartedServerId = COM.frameTime;
		sv_serverid(sv.serverId);

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
		for (var i = 0; i < sv_maxClients(); i++) {
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

		SetConfigstring('systemInfo', COM.GetCvarValues(QS.CVF.SYSTEMINFO));
		SetConfigstring('serverInfo', COM.GetCvarValues(QS.CVF.SERVERINFO));

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
	return json ? JSON.parse(json) : null;
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
		for (var i = 0; i < sv_maxClients(); i++) {
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
		COM.Error('GetUserinfo: bad index ' + clientNum);
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
	for (var i = 0; i < sv_maxClients(); i++) {
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
 * ClientExports
 */
function ClientExports() {
	return {
		sys: sys,
		com: com
	};
}

/**
 * ClipmapExports
 */
function ClipmapExports() {
	return {
		sys: {
			ReadFile: SYS.ReadFile
		},
		com: {
			ERR:   COM.ERR,
			Error: COM.Error
		}
	};
}

/**
 * GameExports
 */
function GameExports() {
	return {
		sys: SYS,
		com: {
			Error:         COM.Error,
			ExecuteBuffer: COM.ExecuteBuffer,
			AddCmd:        COM.AddCmd,
			AddCvar:       COM.AddCvar,
			GetCvarVal:    COM.GetCvarVal,
			SetCvarVal:    COM.SetCvarVal
		},
		sv: {
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
