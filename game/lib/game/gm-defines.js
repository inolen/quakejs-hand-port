var FRAMETIME = 100;  // msec

var GIB_HEALTH = -40;
var ITEM_RADIUS = 15;
var CARNAGE_REWARD_TIME = 3000;
var REWARD_SPRITE_TIME  = 2000;

var DAMAGE = {
	RADIUS:        0x00000001,                             // damage was indirect
	NO_ARMOR:      0x00000002,                             // armour does not protect from this damage
	NO_KNOCKBACK:  0x00000004,                             // do not affect velocity, just view angles
	NO_PROTECTION: 0x00000008                              // armor, shields, invulnerability, and godmode have no effect
};

// GameEntity flags
var GFL = {
	GODMODE:       0x00000010,
	NOTARGET:      0x00000020,
	TEAMSLAVE:     0x00000400,                             // not the first on the team
	NO_KNOCKBACK:  0x00000800,
	DROPPED_ITEM:  0x00001000,
	NO_BOTS:       0x00002000,                             // spawn point not for bot use
	NO_HUMANS:     0x00004000,                             // spawn point just for bots
	FORCE_GESTURE: 0x00008000                              // force gesture on client
};

var LevelLocals = function () {
	this.framenum     = 0;
	this.previousTime = 0;
	this.time         = 0;
	this.startTime    = 0;
	this.clients      = new Array(MAX_CLIENTS);
	this.gentities    = new Array(MAX_GENTITIES);

	for (var i = 0; i < MAX_GENTITIES; i++) {
		this.gentities[i] = new GameEntity();
	}
};

// The server does not know how to interpret most of the values
// in entityStates (level eType), so the game must explicitly flag
// special server behaviors.
var SVF = {
	NOCLIENT:           0x00000001,                        // don't send entity to clients, even if it has effects
	BOT:                0x00000002,                        // set if the entity is a bot
	BROADCAST:          0x00000008,                        // send to all connected clients
	PORTAL:             0x00000020,                        // merge a second pvs at origin2 into snapshots
	USE_CURRENT_ORIGIN: 0x00000040,                        // entity->r.currentOrigin instead of entity->s.origin
	                                                       // for link position (missiles and movers)
	SINGLECLIENT:       0x00000080,                        // only send to a single client (entityShared_t->singleClient)
	NOTSINGLECLIENT:    0x00000100                         // send entity to everyone but one client
};

var GameEntity = function () {
	this.reset();
};

GameEntity.prototype.reset = function () {
	//
	// Shared by game and server.
	//
	this.s             = new sh.EntityState();
	this.linked        = false;
	// SVF_NOCLIENT, SVF_BROADCAST, etc.
	this.svFlags       = 0;
	// Only send to this client when SVF_SINGLECLIENT is set.
	this.singleClient  = 0;
	// If false, assume an explicit mins / maxs bounding box only set by trap_SetBrushModel.
	this.bmodel        = false;
	this.mins          = [0, 0, 0];
	this.maxs          = [0, 0, 0];
	// CONTENTS.TRIGGER, CONTENTS.SOLID, CONTENTS.BODY (non-solid ent should be 0)
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
	// When a trace call is made and passEntityNum != ENTITYNUM_NONE,
	// an ent will be excluded from testing if:
	// ent.s.number == passEntityNum                   (don't interact with self)
	// ent.ownerNum == passEntityNum                   (don't interact with your own missiles)
	// entity[ent.ownerNum].ownerNum == passEntityNum  (don't interact with other missiles from owner)
	this.ownerNum      = ENTITYNUM_NONE;

	//
	// Game only
	//
	this.parent              = null;
	this.inuse               = false;
	this.classname           = 'noclass';
	this.spawnflags          = 0;

	this.freeTime            = 0;                          // level.time when the object was freed
	this.eventTime           = 0;                          // events will be cleared EVENT_VALID_MSEC after set
	this.freeAfterEvent      = false;
	this.unlinkAfterEvent    = false;

	this.model               = null;
	this.model2              = null;
	this.physicsObject       = false;                      // if true, it can be pushed by movers and fall off edges
	                                                       // all game items are physicsObjects
	this.physicsBounce       = 0;                          // 1.0 = continuous bounce, 0.0 = no bounce
	this.clipmask            = 0;                          // brushes with this content value will be collided against
	                                                       // when moving. items and corpses do not collide against
	                                                       // players, for instance
	// movers
	this.moverState          = 0;
	this.soundPos1           = 0;
	this.sound1to2           = 0;
	this.sound2to1           = 0;
	this.soundPos2           = 0;
	this.soundLoop           = 0;
	this.nextTrain           = null;
	this.prevTrain           = null;
	this.pos1                = [0, 0, 0];
	this.pos2                = [0, 0, 0];

	this.target              = null;
	this.targetName          = null;
	this.team                = null;
	this.targetShaderName    = null;
	this.targetShaderNewName = null;
	this.targetEnt           = null;

	this.nextthink           = 0;
	this.think               = null;

	this.timestamp           = 0;                          // body queue sinking, etc

	this.painDebounceTime    = 0;
	this.flyDebounceTime     = 0;                          // wind tunnel

	this.health              = 0;
	this.takeDamage          = false;

	this.damage              = 0;
	this.splashDamage        = 0;                          // quad will increase this without increasing radius
	this.splashRadius        = 0;
	this.methodOfDeath       = 0;
	this.splashMethodOfDeath = 0;

	this.count               = 0;                          // items

	this.chain               = null;
	this.enemy               = null;
	this.activator           = null;
	this.teamchain           = null; // next entity in team
	this.teammaster          = null; // master of the team

}

// This structure is cleared on each ClientSpawn(),
// except for 'client->pers' and 'client->sess'.
var GameClient = function () {
	this.ps                = new sh.PlayerState();
	this.pers              = new GameClientPersistant();

	this.noclip            = false;

	this.lastCmdTime       = 0;                            // level.time of last usercmd_t, for EF_CONNECTION
	                                                       // we can't just use pers.lastCommand.time, because
	                                                       // of the g_sycronousclients case

	this.oldOrigin         = [0, 0, 0];

	// Sum up damage over an entire frame, so
	// shotgun blasts give a single big kick.
	this.damage_armor      = 0;                            // damage absorbed by armor
	this.damage_blood      = 0;                            // damage taken out of health
	this.damage_knockback  = 0;                            // impact damage
	this.damage_from       = [0, 0, 0];                    // origin for vector calculation
	this.damage_fromWorld  = false;                        // if true, don't use the damage_from vector

	// Awards
	this.impressive_count  = 0;                            // for "impressive" reward sound
	this.accuracy_shots    = 0;                            // total number of shots
	this.accuracy_hits     = 0;                            // total number of hits

	// Taunts
	this.lastkilled_client = 0;                            // last client that this client killed
	this.lasthurt_mod      = 0;                            // type of damage the client did

	// Timers
	this.respawnTime       = 0;                            // can respawn when time > this, force after g_forcerespwan
	this.inactivityTime    = 0;                            // kick players when time > this
	this.inactivityWarning = 0;                            // true if the five second warning has been given
	this.rewardTime        = 0;                            // clear the EF.AWARD_IMPRESSIVE, etc when time > this

	//
	this.airOutTime        = 0;
};

// Client data that stays across multiple respawns, but is cleared
// on each level change or team change at ClientBegin()
var GameClientPersistant = function () {
	this.cmd     = new sh.UserCmd();
	this.netname = null;
};