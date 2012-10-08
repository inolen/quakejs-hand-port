var CMD_BACKUP = 64;
var CMD_MASK   = (CMD_BACKUP - 1);

var ClientGame = function () {
	this.thisFrameTeleport    = false;
	this.nextFrameTeleport    = false;
	this.time                 = 0;               // this is the time value that the client is rendering at.
	//this.oldTime              = 0;               // time at last frame, used for missile trails and prediction checking
	this.physicsTime          = 0;               // either cg.snap->time or cg.nextSnap->time
	this.latestSnapshotNum    = 0;               // the number of snapshots the client system has received
	this.latestSnapshotTime   = 0;               // the time from latestSnapshotNum, so we don't need to read the snapshot yet
	this.snap                 = null;            // cg.snap->serverTime <= cg.time
	this.nextSnap             = null;            // cg.nextSnap->serverTime > cg.time, or NULL
	// prediction state
	this.hyperspace           = false;           // true if prediction has hit a trigger_teleport
	this.validPPS             = false;
	this.predictedPlayerState = null;
	this.refdef               = new RefDef();
};

var ClientGameStatic = function () {
	this.gameState            = null;
	this.processedSnapshotNum = 0;               // the number of snapshots cgame has requested
}