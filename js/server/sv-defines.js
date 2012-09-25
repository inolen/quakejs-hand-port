var ClientSnapshot = function () {
	this.ps = new PlayerState();
};

var ServerClient = function () {
	this.lastSnapshotTime = 0;
	this.netchan = null;
	this.frames = new Array(PACKET_BACKUP);
	for (var i = 0; i < PACKET_BACKUP; i++) {
		this.frames[i] = new PlayerState();
	}
};

// Persistent across all maps.
var ServerStatic = function () {
	this.time = 0;
	this.clients = [];
};

// Reset for each map.
var ServerLocals = function () {
	this.timeResidual = 0;			// <= 1000 / sv_frame->value
};