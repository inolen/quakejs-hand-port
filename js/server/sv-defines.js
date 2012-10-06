// Persistent across all maps.
var ServerStatic = function () {
	this.initialized = false;
	this.time        = 0;
	this.clients     = [];
};

// Reset for each map.
var ServerLocals = function () {
	this.time          = 0;
	this.timeResidual  = 0;                      // <= 1000 / sv_frame->value
	this.svEntities    = new Array(MAX_GENTITIES);
	this.gameEntities  = null;
	this.gameClients   = null;
};

var ServerEntity = function (number) {
	this.worldSector = null;
	this.baseline    = new EntityState();
	this.number      = number;
};

var ServerClient = function (clientNum) {
	this.clientNum           = clientNum;
	this.state               = ClientState.FREE;
	this.gamestateMessageNum = -1;
	this.lastSnapshotTime    = 0;
	this.netchan             = null;
	this.frames              = new Array(PACKET_BACKUP);
	
	for (var i = 0; i < PACKET_BACKUP; i++) {
		this.frames[i] = new PlayerState();
	}
};

var ClientSnapshot = function () {
	this.ps = new PlayerState();
};

var ClientState = {
	FREE:      0,                                // can be reused for a new connection
	ZOMBIE:    1,                                // client has been disconnected, but don't reuse
	                                             // connection for a couple seconds
	CONNECTED: 2,                                // has been assigned to a client_t, but no gamestate yet
	PRIMED:    3,                                // gamestate has been sent, but client hasn't sent a usercmd
	ACTIVE:    4                                 // client is fully in game
};