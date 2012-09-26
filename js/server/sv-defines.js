// Persistent across all maps.
var ServerStatic = function () {
	this.time    = 0;
	this.clients = [];
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

var ServerClient = function () {
	this.lastSnapshotTime = 0;
	this.netchan          = null;
	this.frames           = new Array(PACKET_BACKUP);
	for (var i = 0; i < PACKET_BACKUP; i++) {
		this.frames[i] = new PlayerState();
	}
};

var ClientSnapshot = function () {
	this.ps = new PlayerState();
};