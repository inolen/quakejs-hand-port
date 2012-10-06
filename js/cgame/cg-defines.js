var ClientGame = function () {
	this.time                 = 0;               // this is the time value that the client is rendering at.
	//this.oldTime              = 0;               // time at last frame, used for missile trails and prediction checking
	this.latestSnapshotNum    = 0;               // the number of snapshots the client system has received
	this.latestSnapshotTime   = 0;               // the time from latestSnapshotNum, so we don't need to read the snapshot yet
	this.snap                 = null;            // cg.snap->serverTime <= cg.time
	this.nextSnap             = null;            // cg.nextSnap->serverTime > cg.time, or NULL
	this.predictedPlayerState = null;
	this.refdef               = new RefDef();
};

var ClientGameStatic = function () {
	this.processedSnapshotNum = 0;               // the number of snapshots cgame has requested
}