/*global vec3: true, mat4: true */

define('common/qshared', ['common/qmath'], function (QMath) {

var GAME_VERSION = 0.1017;

var CMD_BACKUP   = 64;

// If entityState.solid === SOLID_BMODEL, modelIndex is an inline model number
var SOLID_BMODEL = 0xffffff;

/**
 * Cvar flags
 */
var CVF = {
	ARCHIVE:    1,                                         // save to config file
	CHEAT:      2,                                         // save to config file
	USERINFO:   4,                                         // sent to server on connect or change
	SERVERINFO: 8,                                         // sent in response to front end requests
	SYSTEMINFO: 16,                                        // these cvars will be duplicated on all clients
	LATCH:      32                                         // will only change when C code next does
	                                                       // a Cvar_Get(), so it can't be changed
	                                                       // without proper initialization. modified
	                                                       // will be set, even though the value hasn't
	                                                       // changed yet.
};

/**
 * Snapshot flags
 */
var SNAPFLAG_RATE_DELAYED   = 1;
var SNAPFLAG_NOT_ACTIVE     = 2;                           // snapshot used during connection and for zombies
var SNAPFLAG_SERVERCOUNT    = 4;                           // toggled every map_restart so transitions can be detected

/**
 * MAX_* defines used to pre-alloc many structures
 */
var GENTITYNUM_BITS         = 10;
var MAX_CLIENTS             = 32;                          // absolute limit
var MAX_GENTITIES           = (1 << 10);                   // can't be increased without changing drawsurf bit packing
var MAX_MODELS              = 256;                         // these are sent over the net as 8 bits
var MAX_SOUNDS              = 256;                         // so they cannot be blindly increased

/**
 * Faux entity numbers
 */
var ENTITYNUM_NONE          = MAX_GENTITIES-1;
var ENTITYNUM_WORLD         = MAX_GENTITIES-2;
var ENTITYNUM_MAX_NORMAL    = MAX_GENTITIES-2;

/**
 * Communicated across the network
 */
var NA = {
	BAD:      0,
	LOOPBACK: 1,
	IP:       2
};

var NS = {
	CLIENT: 0,
	SERVER: 1
};

var NetAdr = function () {
	this.type = NA.BAD;
	this.ip   = null;
	this.port = 0;
};

var BUTTON = {
	ATTACK:       1,
	TALK:         2,                                       // displays talk balloon and disables actions
	USE_HOLDABLE: 4,
	GESTURE:      8,
	WALKING:      16,                                      // walking can't just be infered from MOVE_RUN
	                                                       // because a key pressed late in the frame will
	                                                       // only generate a small move value for that frame
	                                                       // walking will use different animations and
	                                                       // won't generate footsteps
	AFFIRMATIVE:  32,
	NEGATIVE:     64,
	GETFLAG:      128,
	GUARDBASE:    256,
	PATROL:       512,
	FOLLOWME:     1024,
	ANY:          2048                                     // any key whatsoever
};

var UserCmd = function () {
	this.serverTime  = 0;
	this.angles      = vec3.create();
	this.forwardmove = 0;
	this.rightmove   = 0;
	this.upmove      = 0;
	this.buttons     = 0;
	this.weapon      = 0;
};

UserCmd.prototype.clone = function (cmd) {
	if (typeof(cmd) === 'undefined') {
		cmd = new UserCmd();
	}

	cmd.serverTime = this.serverTime;
	vec3.set(this.angles, cmd.angles);
	cmd.forwardmove = this.forwardmove;
	cmd.rightmove = this.rightmove;
	cmd.upmove = this.upmove;
	cmd.buttons = this.buttons;
	cmd.weapon = this.weapon;

	return cmd;
};

/**
 * Player state
 */
var MAX_STATS               = 16;
var MAX_PERSISTANT          = 16;
var MAX_POWERUPS            = 16;
var MAX_WEAPONS             = 16;
var MAX_PS_EVENTS           = 2;
var PMOVEFRAMECOUNTBITS     = 6;

var PlayerState = function () {
	this.clientNum           = 0;                          // ranges from 0 to MAX_CLIENTS-1
	this.commandTime         = 0;                          // cmd->serverTime of last executed command
	this.pm_type             = 0;
	this.pm_flags            = 0;                          // ducked, jump_held, etc
	this.origin              = vec3.create();
	this.velocity            = vec3.create();
	this.viewangles          = vec3.create();
	this.viewheight          = 0;
	this.delta_angles        = vec3.create();                  // add to command angles to get view direction
	                                                       // changed by spawns, rotating objects, and teleporters
	this.speed               = 0;
	this.gravity             = 0;
	this.groundEntityNum     = ENTITYNUM_NONE;             // ENTITYNUM_NONE = in air
	this.bobCycle            = 0;                          // for view bobbing and footstep generation

	this.weapon              = 0;                          // copied to entityState_t->weapon
	this.weaponState         = 0;
	this.weaponTime          = 0;
	this.legsTimer           = 0;                          // don't change low priority animations until this runs out
	this.legsAnim            = 0;                          // mask off ANIM_TOGGLEBIT

	this.torsoTimer          = 0;                          // don't change low priority animations until this runs out
	this.torsoAnim           = 0;                          // mask off ANIM_TOGGLEBIT

	this.movementDir         = 0;                          // a number 0 to 7 that represents the relative angle
	                                                       // of movement to the view angle (axial and diagonals)
	                                                       // when at rest, the value will remain unchanged
	                                                       // used to twist the legs during strafing
	// Damage feedback.
	this.damageEvent         = 0;                          // when it changes, latch the other parms
	this.damageYaw           = 0;
	this.damagePitch         = 0;
	this.damageCount         = 0;

	this.stats               = new Array(MAX_STATS);
	this.persistant          = new Array(MAX_PERSISTANT);  // stats that aren't cleared on death
	this.powerups            = new Array(MAX_POWERUPS);    // level.time that the powerup runs out
	this.ammo                = new Array(MAX_WEAPONS);

	this.eFlags              = 0;                          // copied to entityState_t->eFlags
	this.eventSequence       = 0;                          // pmove generated events
	this.events              = new Array(MAX_PS_EVENTS);
	this.eventParms          = new Array(MAX_PS_EVENTS);

	this.externalEvent       = 0;                          // events set on player from another source
	this.externalEventParm   = 0;
	this.externalEventTime   = 0;

	// Not communicated over the net.
	this.ping                = 0;                          // server to game info for scoreboard
	this.jumppad_ent         = 0;                          // jumppad entity hit this frame
	this.jumppad_frame       = 0;
	this.pmove_framecount    = 0;
	this.entityEventSequence = 0;

	for (var i = 0; i < MAX_STATS; i++) {
		this.stats[i] = 0;
	}
	for (var i = 0; i < MAX_PERSISTANT; i++) {
		this.persistant[i] = 0;
	}
	for (var i = 0; i < MAX_POWERUPS; i++) {
		this.powerups[i] = 0;
	}
	for (var i = 0; i < MAX_WEAPONS; i++) {
		this.ammo[i] = 0;
	}
};

// deep copy
PlayerState.prototype.clone = function (ps) {
	if (typeof(ps) === 'undefined') {
		ps = new PlayerState();
	}

	ps.clientNum            = this.clientNum;
	ps.commandTime          = this.commandTime;
	ps.pm_type              = this.pm_type;
	ps.pm_flags             = this.pm_flags;
	vec3.set(this.origin, ps.origin);
	vec3.set(this.velocity, ps.velocity);
	vec3.set(this.viewangles, ps.viewangles);
	ps.viewheight           = this.viewheight;
	vec3.set(this.delta_angles, ps.delta_angles);
	ps.speed                = this.speed;
	ps.gravity              = this.gravity;
	ps.groundEntityNum      = this.groundEntityNum;
	ps.bobCycle             = this.bobCycle;
	ps.weapon               = this.weapon;
	ps.weaponState          = this.weaponState;
	ps.weaponTime           = this.weaponTime;
	ps.legsTimer            = this.legsTimer;
	ps.legsAnim             = this.legsAnim;
	ps.torsoTimer           = this.torsoTimer;
	ps.torsoAnim            = this.torsoAnim;
	ps.movementDir          = this.movementDir;
	ps.damageEvent          = this.damageEvent;
	ps.damageYaw            = this.damageYaw;
	ps.damagePitch          = this.damagePitch;
	ps.damageCount          = this.damageCount;
	for (var i = 0; i < MAX_STATS; i++) {
		ps.stats[i] = this.stats[i];
	}
	for (var i = 0; i < MAX_PERSISTANT; i++) {
		ps.persistant[i] = this.persistant[i];
	}
	for (var i = 0; i < MAX_POWERUPS; i++) {
		ps.powerups[i] = this.powerups[i];
	}
	for (var i = 0; i < MAX_WEAPONS; i++) {
		ps.ammo[i] = this.ammo[i];
	}
	ps.eFlags               = this.eFlags;
	ps.eventSequence        = this.eventSequence;
	for (var i = 0; i < MAX_PS_EVENTS; i++) {
		ps.events[i] = this.events[i];
		ps.eventParms[i] = this.eventParms[i];
	}
	ps.externalEvent        = this.externalEvent;
	ps.externalEventParm    = this.externalEventParm;
	ps.externalEventTime    = this.externalEventTime;
	ps.jumppad_ent          = this.jumppad_ent;
	ps.jumppad_frame        = this.jumppad_frame;
	ps.pmove_framecount     = this.pmove_framecount;
	ps.entityEventSequence  = this.entityEventSequence;

	return ps;
};

var TR = {
	STATIONARY:  0,
	INTERPOLATE: 1,                                        // non-parametric, but interpolate between snapshots
	LINEAR:      2,
	LINEAR_STOP: 3,
	SINE:        4,                                        // value = base + sin( time / duration ) * delta
	GRAVITY:     5
};

var Trajectory = function () {
	this.trType     = 0;
	this.trTime     = 0;
	this.trDuration = 0;
	this.trBase     = vec3.create();
	this.trDelta    = vec3.create();
};

Trajectory.prototype.clone = function (tr) {
	if (typeof(tr) === 'undefined') {
		tr = new Trajectory();
	}

	tr.trType = this.trType;
	tr.trTime = this.trTime;
	tr.trDuration = this.trDuration;
	vec3.set(this.trBase, tr.trBase);
	vec3.set(this.trDelta, tr.trDelta);

	return tr;
};

var Orientation = function () {
	this.origin      = vec3.create();                          // in world coordinates
	this.axis        = [                                   // orientation in world
		vec3.create(),
		vec3.create(),
		vec3.create()
	];
	// Used by renderer.
	this.viewOrigin  = vec3.create();                          // viewParms->or.origin in local coordinates
	this.modelMatrix = mat4.create();
};

Orientation.prototype.clone = function (to) {
	if (typeof(to) === 'undefined') {
		to = new Orientation();
	}

	vec3.set(this.origin, to.origin);
	vec3.set(this.axis[0], to.axis[0]);
	vec3.set(this.axis[1], to.axis[1]);
	vec3.set(this.axis[2], to.axis[2]);
	vec3.set(this.viewOrigin, to.viewOrigin);
	mat4.set(this.modelMatrix, to.modelMatrix);

	return to;
};

/**********************************************************
 * EntityState is the information conveyed from the server
 * in an update message about entities that the client will
 * need to render in some way. Different eTypes may use the
 * information in different ways. The messages are delta
 * compressed, so it doesn't really matter if the structure
 * size is fairly large
 **********************************************************/
var EntityState = function () {
	this.reset();
};

EntityState.prototype.reset = function () {
	this.number          = 0;                              // entity index
	this.eType           = 0;                              // entityType_t
	this.eFlags          = 0;
	this.pos             = new Trajectory();               // for calculating position
	this.apos            = new Trajectory();               // for calculating angles
	this.time            = 0;
	this.time2           = 0;
	this.origin          = vec3.create();
	this.origin2         = vec3.create();
	this.angles          = vec3.create();
	this.angles2         = vec3.create();
	this.otherEntityNum  = 0;                              // shotgun sources, etc
	this.otherEntityNum2 = 0;                              // shotgun sources, etc
	this.groundEntityNum = ENTITYNUM_NONE;                 // ENTITYNUM_NONE = in air
	this.constantLight   = 0;                              // r + (g<<8) + (b<<16) + (intensity<<24)
	this.loopSound       = 0;                              // constantly loop this sound
	this.modelIndex      = 0;
	this.modelIndex2     = 0;
	this.clientNum       = 0;                              // 0 to (MAX_CLIENTS - 1), for players and corpses
	this.frame           = 0;
	this.solid           = 0;                              // for client side prediction, trap_linkentity sets this properly
	this.event           = 0;                              // impulse events -- muzzle flashes, footsteps, etc
	this.eventParm       = 0;
	// For players.
	this.powerups        = 0;                              // bit flags
	this.weapon          = 0;                              // determines weapon and flash model, etc
	this.legsAnim        = 0;                              // mask off ANIM_TOGGLEBIT
	this.torsoAnim       = 0;                              // mask off ANIM_TOGGLEBIT
	this.generic1        = 0;
};

// deep copy
EntityState.prototype.clone = function (es) {
	if (typeof(es) === 'undefined') {
		es = new EntityState();
	}

	es.number            = this.number;
	es.eType             = this.eType;
	es.eFlags            = this.eFlags;
	this.pos.clone(es.pos);
	this.apos.clone(es.apos);
	es.time              = this.time;
	es.time2             = this.time2;
	vec3.set(this.origin,  es.origin);
	vec3.set(this.origin2, es.origin2);
	vec3.set(this.angles,  es.angles);
	vec3.set(this.angles2, es.angles2);
	es.otherEntityNum    = this.otherEntityNum;
	es.otherEntityNum2   = this.otherEntityNum2;
	es.groundEntityNum   = this.groundEntityNum;
	es.constantLight     = this.constantLight;
	es.loopSound         = this.loopSound;
	es.modelIndex        = this.modelIndex;
	es.modelIndex2       = this.modelIndex2;
	es.clientNum         = this.clientNum;
	es.frame             = this.frame;
	es.solid             = this.solid;
	es.event             = this.event;
	es.eventParm         = this.eventParm;
	es.powerups          = this.powerups;
	es.weapon            = this.weapon;
	es.legsAnim          = this.legsAnim;
	es.torsoAnim         = this.torsoAnim;
	es.generic1          = this.generic1;

	return es;
};

/**
 * Surface flags
 */
var SURF = {
	NODAMAGE:    0x1,                                      // never give falling damage
	SLICK:       0x2,                                      // effects game physics
	SKY:         0x4,                                      // lighting from environment map
	LADDER:      0x8,
	NOIMPACT:    0x10,                                     // don't make missile explosions
	NOMARKS:     0x20,                                     // don't leave missile marks
	FLESH:       0x40,                                     // make flesh sounds and effects
	NODRAW:      0x80,                                     // don't generate a drawsurface at all
	HINT:        0x100,                                    // make a primary bsp splitter
	SKIP:        0x200,                                    // completely ignore, allowing non-closed brushes
	NOLIGHTMAP:  0x400,                                    // surface doesn't need a lightmap
	POINTLIGHT:  0x800,                                    // generate lighting info at vertexes
	METALSTEPS:  0x1000,                                   // clanking footsteps
	NOSTEPS:     0x2000,                                   // no footstep sounds
	NONSOLID:    0x4000,                                   // don't collide against curves with this set
	LIGHTFILTER: 0x8000,                                   // act as a light filter during q3map -light
	ALPHASHADOW: 0x10000,                                  // do per-pixel light shadow casting in q3map
	NODLIGHT:    0x20000,                                  // don't dlight even if solid (solid lava, skies)
	DUST:        0x40000                                   // leave a dust trail when walking on this surface
};

var CONTENTS = {
	SOLID:         1,                                      // an eye is never valid in a solid
	LAVA:          8,
	SLIME:         16,
	WATER:         32,
	FOG:           64,

	NOTTEAM1:      0x0080,
	NOTTEAM2:      0x0100,
	NOBOTCLIP:     0x0200,

	AREAPORTAL:    0x8000,

	PLAYERCLIP:    0x10000,
	MONSTERCLIP:   0x20000,
	TELEPORTER:    0x40000,
	JUMPPAD:       0x80000,
	CLUSTERPORTAL: 0x100000,
	DONOTENTER:    0x200000,
	BOTCLIP:       0x400000,
	MOVER:         0x800000,

	ORIGIN:        0x1000000,                              // removed before bsping an entity

	BODY:          0x2000000,                              // should never be on a brush, only in game
	CORPSE:        0x4000000,
	DETAIL:        0x8000000,                              // brushes not used for the bsp
	STRUCTURAL:    0x10000000,                             // brushes used for the bsp
	TRANSLUCENT:   0x20000000,                             // don't consume surface fragments inside
	TRIGGER:       0x40000000,
	NODROP:        0x80000000                              // don't leave bodies or items (death fog, lava)
};

var FLAG = {
	ATBASE:      0,
	TAKEN:       1,     // CTF
	TAKEN_RED:   2,     // One Flag CTF
	TAKEN_BLUE:  3,     // One Flag CTF
	DROPPED:     4
};

function atob64(arr) {
	var limit = 1 << 16;
	var length = arr.length;
	var slice = arr.slice || arr.subarray;
	var str;

	if (length < limit) {
		str = String.fromCharCode.apply(String, arr);
	} else {
		var chunks = [];
		var i = 0;
		while (i < length) {
			chunks.push(String.fromCharCode.apply(String, slice.call(arr, i, i + limit)));
			i += limit;
		}
		str = chunks.join('');
	}

	return btoa(str);
}

return {
	GAME_VERSION:          GAME_VERSION,
	CMD_BACKUP:            CMD_BACKUP,
	SOLID_BMODEL:          SOLID_BMODEL,

	SNAPFLAG_RATE_DELAYED: SNAPFLAG_RATE_DELAYED,
	SNAPFLAG_NOT_ACTIVE:   SNAPFLAG_NOT_ACTIVE,
	SNAPFLAG_SERVERCOUNT:  SNAPFLAG_SERVERCOUNT,

	GENTITYNUM_BITS:       GENTITYNUM_BITS,
	MAX_CLIENTS:           MAX_CLIENTS,
	MAX_GENTITIES:         MAX_GENTITIES,
	MAX_MODELS:            MAX_MODELS,
	MAX_SOUNDS:            MAX_SOUNDS,

	ENTITYNUM_NONE:        ENTITYNUM_NONE,
	ENTITYNUM_WORLD:       ENTITYNUM_WORLD,
	ENTITYNUM_MAX_NORMAL:  ENTITYNUM_MAX_NORMAL,

	MAX_STATS:             MAX_STATS,
	MAX_PERSISTANT:        MAX_PERSISTANT,
	MAX_POWERUPS:          MAX_POWERUPS,
	MAX_WEAPONS:           MAX_WEAPONS,
	MAX_PS_EVENTS:         MAX_PS_EVENTS,
	PMOVEFRAMECOUNTBITS:   PMOVEFRAMECOUNTBITS,

	CVF:                   CVF,
	BUTTON:                BUTTON,
	TR:                    TR,
	SURF:                  SURF,
	CONTENTS:              CONTENTS,
	FLAG:                  FLAG,
	NA:                    NA,
	NS:                    NS,

	PlayerState:           PlayerState,
	Trajectory:            Trajectory,
	Orientation:           Orientation,
	EntityState:           EntityState,

	NetAdr:                NetAdr,
	UserCmd:               UserCmd,

	atob64:                atob64
};

});