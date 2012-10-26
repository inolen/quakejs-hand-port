var FRAMETIME = 100; // msec

var LevelLocals = function () {
	this.framenum     = 0;
	this.previousTime = 0;
	this.time         = 0;
	this.clients      = new Array(MAX_CLIENTS);
	this.gentities    = new Array(MAX_GENTITIES);
};

// The server does not know how to interpret most of the values
// in entityStates (level eType), so the game must explicitly flag
// special server behaviors.
var ServerFlags = {
	NOCLIENT:           0x00000001,              // don't send entity to clients, even if it has effects
	BOT:                0x00000002,              // set if the entity is a bot
	BROADCAST:          0x00000008,              // send to all connected clients
	PORTAL:             0x00000020,              // merge a second pvs at origin2 into snapshots
	USE_CURRENT_ORIGIN: 0x00000040,              // entity->r.currentOrigin instead of entity->s.origin
	                                             // for link position (missiles and movers)
	SINGLECLIENT:       0x00000080,              // only send to a single client (entityShared_t->singleClient)
	NOTSINGLECLIENT:    0x00000100               // send entity to everyone but one client
};

var GameEntity = function () {
	/**
	 * Shared by the engine and game.
	 */
	this.s             = new EntityState();
	this.linked        = false;
	// SVF_NOCLIENT, SVF_BROADCAST, etc.
	this.svFlags       = 0;
	// Only send to this client when SVF_SINGLECLIENT is set.
	this.singleClient  = 0;
	// If false, assume an explicit mins / maxs bounding box only set by trap_SetBrushModel.
	this.bmodel        = false;
	this.mins          = [0, 0, 0];
	this.maxs          = [0, 0, 0];
	// ContentTypes.TRIGGER, ContentTypes.SOLID, ContentTypes.BODY (non-solid ent should be 0)
	this.contents      = 0;
	// Derived from mins/maxs and origin + rotation.
	this.absmin        = [0, 0, 0];
	this.absmax        = [0, 0, 0];
	// currentOrigin will be used for all collision detection and world linking.
	// it will not necessarily be the same as the trajectory evaluation for the current
	// time, because each entity must be moved one at a time after time is advanced
	// to avoid simultanious collision issues.
	this.currentOrigin = [0, 0, 0];
	this.currentAngles = [0, 0, 0];
	this.client        = null;

	/**
	 * Game only
	 */
	this.classname     = 'noclass';
	this.spawnflags    = 0;
	this.model         = null;
	this.model2        = null;
	this.target        = null;
	this.targetname    = null;
	this.nextthink     = 0;
};

// This structure is cleared on each ClientSpawn(),
// except for 'client->pers' and 'client->sess'.
var GameClient = function () {
	this.ps   = new PlayerState();
	this.pers = new GameClientPersistant();
};

// Client data that stays across multiple respawns, but is cleared
// on each level change or team change at ClientBegin()
var GameClientPersistant = function () {
	this.cmd     = new UserCmd();
	this.netname = null;
};