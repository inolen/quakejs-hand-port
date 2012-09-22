var ClientSnapshot = function () {
	this.ps = new PlayerState();
};

var Client = function () {
	this.lastSnapshotTime = 0;
	this.netchan = null;
	this.frames = new Array(PACKET_BACKUP);
	for (var i = 0; i < PACKET_BACKUP; i++) {
		this.frames[i] = new PlayerState();
	}
	this.ps = new PlayerState();
};

// Persistent across all maps.
var ServerStatic = function () {
	this.time = 0;
	this.clients = [];
};

// Reset for each map.
var Server = function () {
};