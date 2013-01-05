var DEFAULT_GRAVITY        = 800;
var GIB_HEALTH             = -40;

var ARMOR_PROTECTION       = 0.66;

var RANK_TIED_FLAG         = 0x4000;

var DEFAULT_SHOTGUN_SPREAD = 700;
var DEFAULT_SHOTGUN_COUNT  = 11;

var LIGHTNING_RANGE        = 768;

var SCORE_NOT_PRESENT      = -9999;  // for the CS_SCORES[12] when only one player is present


var MINS_Z                 = -24;
var DEFAULT_VIEWHEIGHT     = 26;
var CROUCH_VIEWHEIGHT      = 12;
var DEAD_VIEWHEIGHT        = -16;

var CS_FLAGSTATUS          = 23;

var MAX_TOUCH_ENTS = 32;

var PmoveLocals = function () {
	this.reset();
};

PmoveLocals.prototype.reset = function () {
	this.forward             = vec3.create();
	this.right               = vec3.create();
	this.up                  = vec3.create();

	this.frameTime           = 0;
	this.msec                = 0;

	this.walking             = false;
	this.groundPlane         = false;
	this.groundTrace         = null; // TODO pre-alloc

	this.impactSpeed         = 0;

	this.previous_origin     = vec3.create();
	this.previous_velocity   = vec3.create();
	this.previous_waterlevel = 0;
};

var PmoveInfo = function () {
	this.ps            = null;
	this.cmd           = new QShared.UserCmd();
	this.mins          = vec3.create();
	this.maxs          = vec3.create();
	this.tracemask     = 0;                                // collide against these surfaces
	this.gauntletHit   = false;                            // true if a gauntlet attack would actually hit something

	// results (out)
	this.touchEnts     = new Array(MAX_TOUCH_ENTS);
	this.numTouch      = 0;
	this.xyspeed       = 0;
	this.watertype     = 0;
	this.waterlevel    = 0;

	// Callbacks to test the world. These will be
	// different functions during cgame and game.
	this.trace         = null;
	this.pointContents = null;
};

var Animation = function () {
	this.firstFrame  = 0;
	this.numFrames   = 0;
	this.loopFrames  = 0;                                  // 0 to numFrames
	this.frameLerp   = 0;                                  // msec between frames
	this.initialLerp = 0;                                  // msec to get to first frame
	this.reversed    = false;                              // true if animation is reversed
	this.flipflop    = false;                              // true if animation should flipflop back to base
};

var PM = {
	NORMAL:         0,                                       // can accelerate and turn
	NOCLIP:         1,                                       // noclip movement
	SPECTATOR:      2,                                       // still run into walls
	DEAD:           3,                                       // no acceleration or turning, but free falling
	FREEZE:         4,                                       // stuck in place with no control
	INTERMISSION:   5,                                       // no movement or status bar
	SPINTERMISSION: 6
};

var PMF = {
	DUCKED:         1,
	JUMP_HELD:      2,
	NO_ATTACK:      4,
	BACKWARDS_JUMP: 8,                                     // go into backwards land
	BACKWARDS_RUN:  16,                                    // coast down to backwards run
	TIME_LAND:      32,                                    // pm_time is time before rejump
	TIME_KNOCKBACK: 64,                                    // pm_time is an air-accelerate only time
	TIME_WATERJUMP: 256,                                   // pm_time is waterjump
	RESPAWNED:      512,                                   // clear after attack and jump buttons come up
	USE_ITEM_HELD:  1024,
	GRAPPLE_PULL:   2048,                                  // pull towards grapple location
	FOLLOW:         4096,                                  // spectate following another player
	SCOREBOARD:     8192,                                  // spectate as a scoreboard
	INVULEXPAND:    16384,                                 // invulnerability sphere set to full size
	ALL_TIMES:      (32|64|256)
};

var GT = {
	FFA:           0,                                      // free for all
	TOURNAMENT:    1,                                      // one on one tournament
	SINGLE_PLAYER: 2,                                      // single player ffa
	// TEAM GAMES GO AFTER THIS
	TEAM:          3,                                      // team deathmatch
	CTF:           4,                                      // capture the flag
	NFCTF:         5,
	// OBELISK:       6,
	// HARVESTER:     7,
	CLANARENA:     6,
	MAX_GAME_TYPE: 7
};

// Weapon state.
var WS = {
	READY:    0,
	RAISING:  1,
	DROPPING: 2,
	FIRING:   3
};

// Item types.
var IT = {
	BAD:                0,
	WEAPON:             1,                                 // EFX: rotate + upscale + minlight
	AMMO:               2,                                 // EFX: rotate
	ARMOR:              3,                                 // EFX: rotate + minlight
	HEALTH:             4,                                 // EFX: static external sphere + rotating internal
	POWERUP:            5,                                 // instant on, timer based
	                                                       // EFX: rotate + external ring that rotates
	HOLDABLE:           6,                                 // single use, holdable item
	                                                       // EFX: rotate + bob
	PERSISTANT_POWERUP: 7,
	TEAM:               8
};

var MASK = {
	ALL:         -1,
	SOLID:       CONTENTS.SOLID,
	PLAYERSOLID: CONTENTS.SOLID | CONTENTS.PLAYERCLIP | CONTENTS.BODY,
	DEADSOLID:   CONTENTS.SOLID | CONTENTS.PLAYERCLIP,
	WATER:       CONTENTS.WATER | CONTENTS.LAVA | CONTENTS.SLIME,
	OPAQUE:      CONTENTS.SOLID | CONTENTS.SLIME | CONTENTS.LAVA,
	SHOT:        CONTENTS.SOLID | CONTENTS.BODY | CONTENTS.CORPSE
};

/**
 * Playerstate flags
 */
var STAT = {
	HEALTH:        0,
	HOLDABLE_ITEM: 1,
	WEAPONS:       2,
	ARMOR:         3,
	DEAD_YAW:      4,				// look this direction when dead (FIXME: get rid of?)
	CLIENTS_READY: 5,				// bit mask of clients wishing to exit the intermission (FIXME: configstring?)
	MAX_HEALTH:    6				// health / armor limit, changable by handicap
};

var WP = {
	NONE:             0,
	GAUNTLET:         1,
	MACHINEGUN:       2,
	SHOTGUN:          3,
	GRENADE_LAUNCHER: 4,
	ROCKET_LAUNCHER:  5,
	LIGHTNING:        6,
	RAILGUN:          7,
	PLASMAGUN:        8,
	BFG:              9,
	GRAPPLING_HOOK:   10,
	NUM_WEAPONS:      11
};

// NOTE: may not have more than 16
var PW = {
	NONE:         0,
	QUAD:         1,
	BATTLESUIT:   2,
	HASTE:        3,
	INVIS:        4,
	REGEN:        5,
	FLIGHT:       6,
	REDFLAG:      7,
	BLUEFLAG:     8,
	NEUTRALFLAG:  9,
	NUM_POWERUPS: 10
};

var TEAM = {
	FREE:      0,
	RED:       1,
	BLUE:      2,
	SPECTATOR: 3,
	NUM_TEAMS: 4
};

var SPECTATOR = {
	NOT:        0,
	FREE:       1,
	FOLLOW:     2,
	SCOREBOARD: 3
};

// PlayerState.persistant[] indexes
// These fields are the only part of player_state that aren't
// cleared on respawn.
// NOTE: may not have more than 16
var PERS = {
	SCORE:                0,                               // !!! MUST NOT CHANGE, SERVER AND GAME BOTH REFERENCE !!!
	HITS:                 1,                               // total points damage inflicted so damage beeps can sound on change
	RANK:                 2,                               // player rank or team rank
	TEAM:                 3,                               // player team
	SPECTATOR_STATE:      4,
	SPAWN_COUNT:          5,                               // incremented every respawn
	PLAYEREVENTS:         6,                               // 16 bits that can be flipped for events
	ATTACKER:             7,                               // clientnum of last damage inflicter
	ATTACKEE_ARMOR:       8,                               // health/armor of last person we attacked
	KILLED:               9,                               // count of the number of times you died
	// player awards tracking
	IMPRESSIVE_COUNT:     10,                               // two railgun hits in a row
	EXCELLENT_COUNT:      11,                              // two successive kills in a short amount of time
	DEFEND_COUNT:         12,                              // defend awards
	ASSIST_COUNT:         13,                              // assist awards
	GAUNTLET_FRAG_COUNT:  14,                              // kills with the guantlet
	CAPTURES:             15                               // captures
};

// reward sounds (stored in ps->persistant[PERS_PLAYEREVENTS])
var PLAYEREVENTS = {
	DENIEDREWARD:   0x0001,
	GAUNTLETREWARD: 0x0002,
	HOLYSHIT:       0x0004
};

/**
 * Entitystate flags
 */
// entityState_t->eType
var ET = {
	GENERAL:          0,
	PLAYER:           1,
	ITEM:             2,
	MISSILE:          3,
	MOVER:            4,
	BEAM:             5,
	PORTAL:           6,
	SPEAKER:          7,
	PUSH_TRIGGER:     8,
	TELEPORT_TRIGGER: 9,
	INVISIBLE:        10,
	GRAPPLE:          11,                                  // grapple hooked on wall
	TEAM:             12,
	EVENTS:           13                                   // any of the EV_* events can be added freestanding
	                                                       // by setting eType to ET_EVENTS + eventNum
	                                                       // this avoids having to set eFlags and eventNum
};

// entityState_t->eFlags
var EF = {
	DEAD:             0x00000001,                          // don't draw a foe marker over players with EF_DEAD
	TELEPORT_BIT:     0x00000004,                          // toggled every time the origin abruptly changes
	AWARD_EXCELLENT:  0x00000008,                          // draw an excellent sprite
	PLAYER_EVENT:     0x00000010,
	BOUNCE:           0x00000010,                          // for missiles
	BOUNCE_HALF:      0x00000020,                          // for missiles
	AWARD_GAUNTLET:   0x00000040,                          // draw a gauntlet sprite
	NODRAW:           0x00000080,                          // may have an event, but no model (unspawned items)
	FIRING:           0x00000100,                          // for lightning gun
	KAMIKAZE:         0x00000200,
	MOVER_STOP:       0x00000400,                          // will push otherwise
	AWARD_CAP:        0x00000800,                          // draw the capture sprite
	TALK:             0x00001000,                          // draw a talk balloon
	CONNECTION:       0x00002000,                          // draw a connection trouble sprite
	VOTED:            0x00004000,                          // already cast a vote
	AWARD_IMPRESSIVE: 0x00008000,                          // draw an impressive sprite
	AWARD_DEFEND:     0x00010000,                          // draw a defend sprite
	AWARD_ASSIST:     0x00020000,                          // draw an assist sprite
	AWARD_DENIED:     0x00040000,                          // denied
	TEAMVOTED:        0x00080000                           // already cast a team vote
};

/**********************************************************
 *
 * Entitystate events
 *
 * Entity events are for effects that take place relative
 * to an existing entities origin. Very network efficient.
 *
 * Two bits at the top of the entityState->event field
 * will be incremented with each change in the event so
 * that an identical event started twice in a row can
 * be distinguished. And off the value with ~EV_EVENT_BITS
 * to retrieve the actual event number.
 *
 **********************************************************/
var EV_EVENT_BIT1    = 0x00000100;
var EV_EVENT_BIT2    = 0x00000200;
var EV_EVENT_BITS    = (EV_EVENT_BIT1|EV_EVENT_BIT2);
var EVENT_VALID_MSEC = 300;

var EV = {
	NONE:                0,

	FOOTSTEP:            1,
	FOOTSTEP_METAL:      2,
	FOOTSPLASH:          3,
	FOOTWADE:            4,
	SWIM:                5,

	STEP_4:              6,
	STEP_8:              7,
	STEP_12:             8,
	STEP_16:             9,

	FALL_SHORT:          10,
	FALL_MEDIUM:         11,
	FALL_FAR:            12,

	JUMP_PAD:            13,                               // boing sound at origin, jump sound on player

	JUMP:                14,
	WATER_TOUCH:         15,                               // foot touches
	WATER_LEAVE:         16,                               // foot leaves
	WATER_UNDER:         17,                               // head touches
	WATER_CLEAR:         18,                               // head leaves

	ITEM_PICKUP:         19,                               // normal item pickups are predictable
	GLOBAL_ITEM_PICKUP:  20,                               // powerup / team sounds are broadcast to everyone

	NOAMMO:              21,
	CHANGE_WEAPON:       22,
	FIRE_WEAPON:         23,

	USE_ITEM0:           24,
	USE_ITEM1:           25,
	USE_ITEM2:           26,
	USE_ITEM3:           27,
	USE_ITEM4:           28,
	USE_ITEM5:           29,
	USE_ITEM6:           30,
	USE_ITEM7:           31,
	USE_ITEM8:           32,
	USE_ITEM9:           33,
	USE_ITEM10:          34,
	USE_ITEM11:          35,
	USE_ITEM12:          36,
	USE_ITEM13:          37,
	USE_ITEM14:          38,
	USE_ITEM15:          39,

	ITEM_RESPAWN:        40,
	ITEM_POP:            41,
	PLAYER_TELEPORT_IN:  42,
	PLAYER_TELEPORT_OUT: 43,

	GRENADE_BOUNCE:      44,                               // eventParm will be the soundindex

	GENERAL_SOUND:       45,
	GLOBAL_SOUND:        46,                               // no attenuation
	GLOBAL_TEAM_SOUND:   47,

	BULLET_HIT_FLESH:    48,
	BULLET_HIT_WALL:     49,

	MISSILE_HIT:         50,
	MISSILE_MISS:        51,
	MISSILE_MISS_METAL:  52,
	RAILTRAIL:           53,
	SHOTGUN:             54,
	BULLET:              55,                               // otherEntity is the shooter

	PAIN:                56,
	DEATH1:              57,
	DEATH2:              58,
	DEATH3:              59,
	OBITUARY:            60,

	POWERUP_QUAD:        61,
	POWERUP_BATTLESUIT:  62,
	POWERUP_REGEN:       63,

	GIB_PLAYER:          64,                               // gib a previously living player
	SCOREPLUM:           65,                               // score plum

	DEBUG_LINE:          66,
	STOPLOOPINGSOUND:    67,
	TAUNT:               68,
	TAUNT_YES:           69,
	TAUNT_NO:            70,
	TAUNT_FOLLOWME:      71,
	TAUNT_GETFLAG:       72,
	TAUNT_GUARDBASE:     73,
	TAUNT_PATROL:        74
};

/**
 *  global_team_sound_t
 */
var GTS = {
	RED_CAPTURE:          0,
	BLUE_CAPTURE:         1,
	RED_RETURN:           2,
	BLUE_RETURN:          3,
	RED_TAKEN:            4,
	BLUE_TAKEN:           5,
	REDOBELISK_ATTACKED:  6,
	BLUEOBELISK_ATTACKED: 7,
	REDTEAM_SCORED:       8,
	BLUETEAM_SCORED:      9,
	REDTEAM_TOOK_LEAD:    10,
	BLUETEAM_TOOK_LEAD:   11,
	TEAMS_ARE_TIED:       12,
	KAMIKAZE:             13
};

/**
 * Animations
 */
// Flip the togglebit every time an animation
// changes so a restart of the same anim can be detected.
var ANIM_TOGGLEBIT = 128;

var ANIM = {
	BOTH_DEATH1:         0,
	BOTH_DEAD1:          1,
	BOTH_DEATH2:         2,
	BOTH_DEAD2:          3,
	BOTH_DEATH3:         4,
	BOTH_DEAD3:          5,

	TORSO_GESTURE:       6,

	TORSO_ATTACK:        7,
	TORSO_ATTACK2:       8,

	TORSO_DROP:          9,
	TORSO_RAISE:         10,

	TORSO_STAND:         11,
	TORSO_STAND2:        12,

	LEGS_WALKCR:         13,
	LEGS_WALK:           14,
	LEGS_RUN:            15,
	LEGS_BACK:           16,
	LEGS_SWIM:           17,

	LEGS_JUMP:           18,
	LEGS_LAND:           19,

	LEGS_JUMPB:          20,
	LEGS_LANDB:          21,

	LEGS_IDLE:           22,
	LEGS_IDLECR:         23,

	LEGS_TURN:           24,

	TORSO_GETFLAG:       25,
	TORSO_GUARDBASE:     26,
	TORSO_PATROL:        27,
	TORSO_FOLLOWME:      28,
	TORSO_AFFIRMATIVE:   29,
	TORSO_NEGATIVE:      30,

	MAX:                 31,

	LEGS_BACKCR:         32,
	LEGS_BACKWALK:       33,
	FLAG_RUN:            34,
	FLAG_STAND:          35,
	FLAG_STAND2RUN:      36,

	MAX_TOTALANIMATIONS: 37
};

// Means of death
var MOD = {
	UNKNOWN:        0,
	SHOTGUN:        1,
	GAUNTLET:       2,
	MACHINEGUN:     3,
	GRENADE:        4,
	GRENADE_SPLASH: 5,
	ROCKET:         6,
	ROCKET_SPLASH:  7,
	PLASMA:         8,
	PLASMA_SPLASH:  9,
	RAILGUN:        10,
	LIGHTNING:      11,
	BFG:            12,
	BFG_SPLASH:     13,
	WATER:          14,
	SLIME:          15,
	LAVA:           16,
	CRUSH:          17,
	TELEFRAG:       18,
	FALLING:        19,
	SUICIDE:        20,
	TARGET_LASER:   21,
	TRIGGER_HURT:   22,
	GRAPPLE:        23
};
