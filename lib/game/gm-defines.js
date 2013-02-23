var BODY_QUEUE_SIZE = 8;

var FRAMETIME = 100;  // msec

var ITEM_RADIUS = 15;
var CARNAGE_REWARD_TIME = 3000;
var REWARD_SPRITE_TIME  = 2000;

var INTERMISSION_DELAY_TIME = 1000;

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

// The server does not know how to interpret most of the values
// in entityStates (level eType), so the game must explicitly flag
// special server behaviors.
var SVF = {
	NOCLIENT:           0x00000001,                        // don't send entity to clients, even if it has effects
	BOT:                0x00000002,                        // set if the entity is a bot
	BROADCAST:          0x00000008,                        // send to all connected clients
	PORTAL:             0x00000020,                        // merge a second pvs at origin2 into snapshots
	USE_CURRENT_ORIGIN: 0x00000040,                        // entity->r.r.currentOrigin instead of entity->s.origin
	                                                       // for link position (missiles and movers)
	SINGLECLIENT:       0x00000080,                        // only send to a single client (entityShared_t->singleClient)
	NOTSINGLECLIENT:    0x00000100                         // send entity to everyone but one client
};

var MOVER = {
	POS1: 0,
	POS2: 1,
	ONETOTWO: 2,
	TWOTOONE: 3
};

var CON = {
	DISCONNECTED: 0,
	CONNECTING:   1,
	CONNECTED:    2
};

var TEAM_STATE = {
	BEGIN:      0,                                         // Beginning a team game, spawn at base
	ACTIVE:     1,                                         // Now actively playing
	ELIMINATED: 2
};

var GameLocals = function () {
	this.clients                = new Array(MAX_CLIENTS);
	this.gentities              = new Array(MAX_GENTITIES);

	this.gentitySize            = 0;
	this.num_entities           = 0;                       // MAX_CLIENTS <= num_entities <= ENTITYNUM_MAX_NORMAL

	this.maxclients             = 0;

	this.framenum               = 0;
	this.previousTime           = 0;
	this.time                   = 0;

	this.startTime              = 0;

	this.lastTeamLocationTime   = 0;                       // last time of client team location update

	this.newSession             = false;                   // don't use any old session data, because
	                                                       // we changed gametype

	this.restarted              = false;                   // waiting for a map_restart to fire

// 	// voting state
// //	this.voteString             = null;
// //	this.voteDisplayString      = null;
// //	this.voteTime               = 0;                       // level.time vote was called
// //	this.voteExecuteTime        = 0;                       // time the vote is executed
// //	this.voteYes                = 0;
// //	this.voteNo                 = 0;

// 	// team voting state
// //	this.teamVoteString         = new Array(2);
// //	this.teamVoteTime           = new Array(2);            // level.time vote was called
// //	this.teamVoteYes            = new Array(2);
// //	this.teamVoteNo             = new Array(2);

	// spawn variables
	this.spawnVars              = null;

//	qboolean	locationLinked;                            // target_locations get linked
//	gentity_t	*locationHead;                             // head of the location list

	this.bodyQueue              = new Array(BODY_QUEUE_SIZE);
	this.bodyQueueIndex         = 0;

	this.arenas                 = [];
	this.arena                  = null;                    // current arena, set in Frame()
	                                                       // and by the various Client* funcs
	                                                       // invoked directly by the server.
	this.rocketarena            = false;

	for (var i = 0; i < MAX_CLIENTS; i++) {
		this.clients[i] = new GameClient();
	}

	for (var i = 0; i < MAX_GENTITIES; i++) {
		this.gentities[i] = new GameEntity();
	}
};

var ArenaInfo = function () {
	this.arenaNum               = ARENANUM_NONE;

	this.name                   = null;

	this.state                  = null;
	this.teams                  = new Array(TEAM.NUM_TEAMS);
	this.warmupTime             = 0;
	this.restartTime            = 0;
	this.lastWinningTeam        = 0;

//	this.follow1                = 0;                       // clientNums for auto-follow spectators
//	this.follow2;               = 0;
	this.numConnectedClients    = 0;
	this.numNonSpectatorClients = 0;                       // includes connecting clients
	this.numPlayingClients      = 0;                       // connected, non-spectators
	this.sortedClients          = new Array(MAX_CLIENTS);  // sorted by score

	this.intermissionTime       = 0;                       // time the intermission was started

	this.readyToExit            = false;                   // at least one client wants to exit
	this.exitTime               = 0;

	for (var i = 0; i < MAX_CLIENTS; i++) {
		this.teams[i] = new TeamInfo();
	}
};

var TeamInfo = function () {
	this.score = 0;
	this.count = 0;
	this.alive = 0;
};

var GameEntity = function () {
	this.reset();
};

GameEntity.prototype.reset = function () {
	this.s                   = new QS.EntityState();
	this.r                   = new QS.SharedEntity();

	this.client              = null;                       // NULL if not a client

	this.parent              = null;
	this.inuse               = false;
	this.classname           = 'noclass';
	this.spawnflags          = 0;
	this.arena               = ARENANUM_NONE;              // arena flag from editor

	this.freeTime            = 0;                          // level.time when the object was freed
	this.eventTime           = 0;                          // events will be cleared EVENT_VALID_MSEC after set
	this.freeAfterEvent      = false;
	this.unlinkAfterEvent    = false;

	this.neverFree           = false;                      // if true, FreeEntity will only unlink
	                                                       // bodyqueue uses this

	this.model               = null;
	this.model2              = null;
	this.message             = null;
	this.physicsObject       = false;                      // if true, it can be pushed by movers and fall off edges
	                                                       // all game items are physicsObjects
	this.physicsBounce       = 0;                          // 1.0 = continuous bounce, 0.0 = no bounce
	this.clipmask            = 0;                          // brushes with this content value will be collided against
	                                                       // when moving. items and corpses do not collide against
	                                                       // players, for instance
	// Movers.
	this.moverState          = 0;
	this.soundPos1           = 0;
	this.sound1to2           = 0;
	this.sound2to1           = 0;
	this.soundPos2           = 0;
	this.soundLoop           = 0;
	this.nextTrain           = null;
	this.prevTrain           = null;
	this.pos1                = vec3.create();
	this.pos2                = vec3.create();

	this.target              = null;
	this.targetName          = null;
	this.team                = null;
	this.targetShaderName    = null;
	this.targetShaderNewName = null;
	this.targetEnt           = null;

	this.speed               = 0;
	this.wait                = 0;
	this.movedir             = vec3.create();

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
	this.teamchain           = null;                       // next entity in team
	this.teammaster          = null;                       // master of the team

	this.watertype           = 0;
	this.waterlevel          = 0;

	this.noise_index         = 0;

	// timing variables
	this.wait                = 0;
	this.random              = 0;
};

// This structure is cleared on each ClientSpawn(),
// except for 'client->pers' and 'client->sess'.
var GameClient = function () {
	this.reset();
};

GameClient.prototype.reset = function () {
	this.ps                = new QS.PlayerState();
	this.pers              = new ClientPersistant();
	this.sess              = new ClientSession();

	this.readyToExit       = false;                        // wishes to leave the intermission

	this.noclip            = false;

	this.lastCmdTime       = 0;                            // level.time of last usercmd_t, for EF_CONNECTION
	                                                       // we can't just use pers.lastCommand.time, because
	                                                       // of the g_sycronousclients case

	this.oldOrigin         = vec3.create();

	// Sum up damage over an entire frame, so
	// shotgun blasts give a single big kick.
	this.damage_armor      = 0;                            // damage absorbed by armor
	this.damage_blood      = 0;                            // damage taken out of health
	this.damage_knockback  = 0;                            // impact damage
	this.damage_from       = vec3.create();                    // origin for vector calculation
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
	this.lastKillTime      = 0;
	this.airOutTime        = 0;
	this.switchTeamTime    = 0;                            // time the player switched teams
	this.switchArenaTime   = 0;                            // time the player switched arenas
};

var PlayerTeamState = function () {
	this.state              = TEAM_STATE.BEGIN;

	// this.location           = 0;

	this.captures           = 0;
	this.basedefense        = 0;
	this.carrierdefense     = 0;
	this.flagrecovery       = 0;
	this.fragcarrier        = 0;
	this.assists            = 0;

	this.lasthurtcarrier    = 0;
	this.lastreturnedflag   = 0;
	this.flagsince          = 0;
	this.lastfraggedcarrier = 0;
};


// Client data that stays across multiple respawns, but is cleared
// on each level change or team change at ClientBegin()
var ClientPersistant = function () {
	this.connected         = 0;
	this.netname           = null;
	this.cmd               = new QS.UserCmd();
	this.localClient       = false;                        // true if "ip" info key is "localhost"
	this.predictItemPickup = false;                        // based on cg_predictItems userinfo
	this.maxHealth         = 0;                            // for handicapping
	this.enterTime         = 0;                            // level.time the client entered the game
	this.teamState         = new PlayerTeamState();        // status in teamplay games
	this.voteCount         = 0;                            // to prevent people from constantly calling votes
	this.teamVoteCount     = 0;                            // to prevent people from constantly calling votes
	// this.teamInfo          = false;                        // send team overlay updates?
};

ClientPersistant.prototype.clone = function (to) {
	if (typeof(to) === 'undefined') {
		to = new ClientPersistant();
	}

	to.connected = this.connected;
	to.netname = this.netname;
	to.cmd = this.cmd;
	to.localClient = this.localClient;
	to.predictItemPickup = this.predictItemPickup;
	to.maxHealth = this.maxHealth;
	to.enterTime = this.enterTime;
	to.teamState = this.teamState;
	to.voteCount = this.voteCount;
	to.teamVoteCount = this.teamVoteCount;
	// to.teamInfo = this.teamInfo;

	return to;
};

// Client data that stays across multiple levels or tournament restarts.
// This is achieved by writing all the data to cvar strings at game shutdown
// time and reading them back at connection time.  Anything added here
// MUST be dealt with in InitSessionData() / ReadSessionData() / WriteSessionData().
var ClientSession = function () {
	this.sessionTeam      = TEAM.FREE;
	this.spectatorState   = SPECTATOR.NOT;
	this.spectatorClient  = 0;                             // for chasecam and follow mode
	this.spectatorNum     = 0;                             // for determining next-in-line to play
	this.wins             = 0;                             // tournament stats
	this.losses           = 0;
};

ClientSession.prototype.clone = function (to) {
	if (typeof(to) === 'undefined') {
		to = new ClientSession();
	}

	to.sessionTeam = this.sessionTeam;
	to.spectatorState = this.spectatorState;
	to.spectatorClient = this.spectatorClient;
	to.spectatorNum = this.spectatorNum;
	to.wins = this.wins;
	to.losses = this.losses;

	return to;
};
