var MAX_SNAPSHOT_ENTITIES = MAX_CLIENTS * PACKET_BACKUP * 64;

// Persistent across all maps.
var ServerStatic = function () {
	this.initialized          = false;
	this.time                 = 0;
	this.snapFlagServerBit    = 0;               // ^= SNAPFLAG_SERVERCOUNT every SV_SpawnServer()
	this.clients              = [];
	this.nextSnapshotEntities = 0;               // next snapshotEntities to use
	this.snapshotEntities     = new Array(MAX_SNAPSHOT_ENTITIES);
	this.msgBuffer            = new ArrayBuffer(MAX_MSGLEN);

	for (var i = 0; i < MAX_SNAPSHOT_ENTITIES; i++) {
		this.snapshotEntities[i] = new EntityState();
	}
};

// Reset for each map.
var ServerLocals = function () {
	this.serverId        = 0;                      // changes each server start
	this.snapshotCounter = 0;                      // incremented for each snapshot built
	this.time            = 0;
	this.timeResidual    = 0;                      // <= 1000 / sv_frame->value
	this.svEntities      = new Array(MAX_GENTITIES);
	this.gameEntities    = null;
	this.gameClients     = null;
};

var ServerEntity = function (number) {
	this.worldSector     = null;
	this.baseline        = new EntityState();
	this.number          = number;
	this.snapshotCounter = 0;
};

var ServerClient = function (clientNum) {
	this.clientNum           = clientNum;
	this.state               = ClientState.FREE;
	this.gamestateMessageNum = -1;
	this.deltaMessage        = -1;               // frame last client usercmd message
	this.lastSnapshotTime    = 0;
	this.snapshotMsec        = 0;                // requests a snapshot every snapshotMsec unless rate choked
	this.netchan             = null;
	this.frames              = new Array(PACKET_BACKUP);
	this.oldServerTime       = 0;
	
	for (var i = 0; i < PACKET_BACKUP; i++) {
		this.frames[i] = new PlayerState();
	}
};

var ClientSnapshot = function () {
	this.ps = new PlayerState();
	this.numEntities = 0;
	this.firstEntity;		// into the circular sv_packet_entities[]
										// the entities MUST be in increasing state number
										// order, otherwise the delta compression will fail
};

var ClientState = {
	FREE:      0,                                // can be reused for a new connection
	ZOMBIE:    1,                                // client has been disconnected, but don't reuse
	                                             // connection for a couple seconds
	CONNECTED: 2,                                // has been assigned to a client_t, but no gamestate yet
	PRIMED:    3,                                // gamestate has been sent, but client hasn't sent a usercmd
	ACTIVE:    4                                 // client is fully in game
};