var FRAMETIME = 100; // msec

var GameEntity = function () {
	/**
	 * Shared by the engine and game.
	 */
	this.s             = new EntityState();
	this.linked        = false;
	// if false, assume an explicit mins / maxs bounding box only set by trap_SetBrushModel
	this.bmodel        = false;
	this.mins          = [0, 0, 0];
	this.maxs          = [0, 0, 0];
	// ContentFlags.TRIGGER, ContentFlags.SOLID, ContentFlags.BODY (non-solid ent should be 0)
	this.contents      = 0;
	// derived from mins/maxs and origin + rotation
	this.absmin        = [0, 0, 0];
	this.absmax        = [0, 0, 0];
	// currentOrigin will be used for all collision detection and world linking.
	// it will not necessarily be the same as the trajectory evaluation for the current
	// time, because each entity must be moved one at a time after time is advanced
	// to avoid simultanious collision issues
	this.currentOrigin = [0, 0, 0];
	this.currentAngles = [0, 0, 0];
	this.client        = null;

	/**
	 * Game only
	 */
	this.classname     = 'noclass';
	this.model         = null;
	this.model2        = null;
	this.target        = null;
	this.targetname    = null;
	this.nextthink     = 0;
};

var GameClient = function () {
	this.ps = new PlayerState();
};

var LevelLocals = function () {
	this.framenum     = 0;
	this.previousTime = 0;
	this.time         = 0;
	this.clients      = new Array(MAX_CLIENTS);
	this.gentities    = new Array(MAX_GENTITIES);
};