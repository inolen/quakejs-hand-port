var MAX_SNAPSHOT_ENTITIES = MAX_CLIENTS * PACKET_BACKUP * 64;

// Persistent across all maps.
var ServerStatic = function () {
	this.initialized          = false;
	this.time                 = 0;
	this.snapFlagServerBit    = 0;                         // ^= SNAPFLAG_SERVERCOUNT every SV_SpawnServer()
	this.clients              = new Array(MAX_CLIENTS);
	this.nextSnapshotEntities = 0;                         // next snapshotEntities to use
	this.snapshotEntities     = new Array(MAX_SNAPSHOT_ENTITIES);
	this.msgBuffer            = new ArrayBuffer(MAX_MSGLEN);

	for (var i = 0; i < MAX_CLIENTS; i++) {
		this.clients[i] = new ServerClient();
	}

	for (var i = 0; i < MAX_SNAPSHOT_ENTITIES; i++) {
		this.snapshotEntities[i] = new sh.EntityState();
	}
};

// Reset for each map.
var ServerState = {
	DEAD:    0,                                            // no map loaded
	LOADING: 1,                                            // spawning level entities
	GAME:    2                                             // actively running
};

var ServerLocals = function () {
	this.state           = ServerState.DEAD;
	this.restarting      = false;                          // if true, send configstring changes during SS_LOADING
	this.serverId        = 0;                              // changes each server start
	this.snapshotCounter = 0;                              // incremented for each snapshot built
	this.time            = 0;
	this.timeResidual    = 0;                              // <= 1000 / sv_frame->value
	this.configstrings   = {};
	this.svEntities      = new Array(MAX_GENTITIES);
	this.gameEntities    = null;
	this.gameClients     = null;

	for (var i = 0; i < MAX_GENTITIES; i++) {
		this.svEntities[i] = new ServerEntity();
	}
};

var ServerEntity = function () {
	this.worldSector     = null;
	this.baseline        = new sh.EntityState();
	this.number          = 0;
	this.snapshotCounter = 0;
};

var CS = {
	FREE:      0,                                          // can be reused for a new connection
	ZOMBIE:    1,                                          // client has been disconnected, but don't reuse
	                                                       // connection for a couple seconds
	CONNECTED: 2,                                          // has been assigned to a client_t, but no gamestate yet
	PRIMED:    3,                                          // gamestate has been sent, but client hasn't sent a usercmd
	ACTIVE:    4                                           // client is fully in game
};

var ServerClient = function () {
	this.state                   = CS.FREE;
	this.userinfo                = {};

	this.messageAcknowledge      = 0;
	this.reliableCommands        = new Array(MAX_RELIABLE_COMMANDS);
	this.reliableSequence        = 0;                      // last added reliable message, not necesarily sent or acknowledged yet
	this.reliableAcknowledge     = 0;                      // last acknowledged reliable message
	this.reliableSent            = 0;                      // last sent reliable message, not necesarily acknowledged yet

	this.gamestateMessageNum     = -1;

	this.lastUserCmd             = new sh.UserCmd();
	this.lastMessageNum          = 0;                      // for delta compression
	this.lastClientCommand       = 0;                      // reliable client message sequence
	this.lastClientCommandString = null;
	this.name                    = null;                   // extracted from userinfo, high bits masked

	this.deltaMessage            = -1;                     // frame last client usercmd message
	this.nextReliableTime        = 0;                      // svs.time when another reliable command will be allowed
	this.lastSnapshotTime        = 0;
	this.snapshotMsec            = 0;                      // requests a snapshot every snapshotMsec unless rate choked
	this.frames                  = new Array(PACKET_BACKUP);
	
	this.netchan                 = null;
	this.oldServerTime           = 0;
	this.csUpdated               = {};
	
	for (var i = 0; i < PACKET_BACKUP; i++) {
		this.frames[i] = new ClientSnapshot();
	}
};

var ClientSnapshot = function () {
	this.ps          = new sh.PlayerState();
	this.numEntities = 0;
	this.firstEntity = 0;                                  // index into the circular sv_packet_entities[]
	                                                       // the entities MUST be in increasing state number
	                                                       // order, otherwise the delta compression will fail
};