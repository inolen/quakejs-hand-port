var DEFAULT_GRAVITY = 800;
var JUMP_VELOCITY = 270;
var MAX_CLIP_PLANES = 5;
var MIN_WALK_NORMAL = 0.7;
var STEPSIZE = 18;
var OVERCLIP = 1.001;
var DEFAULT_VIEWHEIGHT = 26;
var ITEM_RADIUS = 15;                                      // item sizes are needed for client side pickup detection

/**********************************************************
 * Animations
 **********************************************************/
var Animations = {
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

var Animation = function () {
	this.firstFrame  = 0;
	this.numFrames   = 0;
	this.loopFrames  = 0;			// 0 to numFrames
	this.frameLerp   = 0;			// msec between frames
	this.initialLerp = 0;		// msec to get to first frame
	this.reversed    = false;			// true if animation is reversed
	this.flipflop    = false;			// true if animation should flipflop back to base
};

// Flip the togglebit every time an animation
// changes so a restart of the same anim can be detected.
var ANIM_TOGGLEBIT = 128;

/**********************************************************
 * Game item descriptions
 **********************************************************/
var ItemType = {
	BAD:                0,
	WEAPON:             1,                       // EFX: rotate + upscale + minlight
	AMMO:               2,                       // EFX: rotate
	ARMOR:              3,                       // EFX: rotate + minlight
	HEALTH:             4,                       // EFX: static external sphere + rotating internal
	POWERUP:            5,                       // instant on, timer based
	                                             // EFX: rotate + external ring that rotates
	HOLDABLE:           6,                       // single use, holdable item
	                                             // EFX: rotate + bob
	PERSISTANT_POWERUP: 7,
	TEAM:               8
};

var GameItemDesc = function (classname, modelPaths, giType) {
	this.classname   = classname;                  // spawning name
	this.modelPaths = modelPaths;
	/*char		*pickup_sound;
	char		*world_model[MAX_ITEM_MODELS];

	char		*icon;
	char		*pickup_name;	// for printing on pickup

	int			quantity;		// for ammo how much, or duration of powerup*/
	this.giType    = giType;                     // IT_* flags
	/*int			giTag;

	char		*precaches;		// string of all models and images this item will use
	char		*sounds;		// string of all sounds this item will use*/
};

/**********************************************************
 * Entity state related
 **********************************************************/
// entityState_t->eType
var EntityType = {
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
	GRAPPLE:          11,                        // grapple hooked on wall
	TEAM:             12,
	EVENTS:           13                         // any of the EV_* events can be added freestanding
	                                             // by setting eType to ET_EVENTS + eventNum
	                                             // this avoids having to set eFlags and eventNum
};

// entityState_t->eFlags
var EntityFlags = {
	DEAD:             0x00000001,                // don't draw a foe marker over players with EF_DEAD
	TELEPORT_BIT:     0x00000004,                // toggled every time the origin abruptly changes
	AWARD_EXCELLENT:  0x00000008,                // draw an excellent sprite
	PLAYER_EVENT:     0x00000010,
	BOUNCE:           0x00000010,                // for missiles
	BOUNCE_HALF:      0x00000020,                // for missiles
	AWARD_GAUNTLET:   0x00000040,                // draw a gauntlet sprite
	NODRAW:           0x00000080,                // may have an event, but no model (unspawned items)
	FIRING:           0x00000100,                // for lightning gun
	KAMIKAZE:         0x00000200,
	MOVER_STOP:       0x00000400,                // will push otherwise
	AWARD_CAP:        0x00000800,                // draw the capture sprite
	TALK:             0x00001000,                // draw a talk balloon
	CONNECTION:       0x00002000,                // draw a connection trouble sprite
	VOTED:            0x00004000,                // already cast a vote
	AWARD_IMPRESSIVE: 0x00008000,                // draw an impressive sprite
	AWARD_DEFEND:     0x00010000,                // draw a defend sprite
	AWARD_ASSIST:     0x00020000,                // draw an assist sprite
	AWARD_DENIED:     0x00040000,                // denied
	TEAMVOTED:        0x00080000                 // already cast a team vote
};

/**********************************************************
 * Pmove related
 **********************************************************/
var ContentTypes = {
	SOLID:         1,                            // an eye is never valid in a solid
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

	ORIGIN:        0x1000000,                    // removed before bsping an entity

	BODY:          0x2000000,                    // should never be on a brush, only in game
	CORPSE:        0x4000000,
	DETAIL:        0x8000000,                    // brushes not used for the bsp
	STRUCTURAL:    0x10000000,                   // brushes used for the bsp
	TRANSLUCENT:   0x20000000,                   // don't consume surface fragments inside
	TRIGGER:       0x40000000,
	NODROP:        0x80000000                    // don't leave bodies or items (death fog, lava)
};

var ContentMasks = {
	ALL:         -1,
	SOLID:       ContentTypes.SOLID,
	PLAYERSOLID: ContentTypes.SOLID | ContentTypes.PLAYERCLIP | ContentTypes.BODY,
	DEADSOLID:   ContentTypes.SOLID | ContentTypes.PLAYERCLIP,
	WATER:       ContentTypes.WATER | ContentTypes.LAVA | ContentTypes.SLIME,
	OPAQUE:      ContentTypes.SOLID | ContentTypes.SLIME | ContentTypes.LAVA,
	SHOT:        ContentTypes.SOLID | ContentTypes.BODY | ContentTypes.CORPSE
};

var PmoveType = {
	NORMAL:       0,                             // can accelerate and turn
	NOCLIP:       1,                             // noclip movement
	SPECTATOR:    2,                             // still run into walls
	DEAD:         3,                             // no acceleration or turning, but free falling
	FREEZE:       4,                             // stuck in place with no control
	INTERMISSION: 5                              // no movement or status bar
};

var PmoveFlags = {
	DUCKED:         1,
	JUMP_HELD:      2,
	BACKWARDS_JUMP: 8,                           // go into backwards land
	BACKWARDS_RUN:  16,                          // coast down to backwards run
	TIME_LAND:      32,                          // pm_time is time before rejump
	TIME_KNOCKBACK: 64,                          // pm_time is an air-accelerate only time
	TIME_WATERJUMP: 256,                         // pm_time is waterjump
	RESPAWNED:      512,                         // clear after attack and jump buttons come up
	USE_ITEM_HELD:  1024,
	GRAPPLE_PULL:   2048,                        // pull towards grapple location
	FOLLOW:         4096,                        // spectate following another player
	SCOREBOARD:     8192,                        // spectate as a scoreboard
	INVULEXPAND:    16384,                       // invulnerability sphere set to full size
	ALL_TIMES:      (32|64|256)
};

var PmoveInfo = function () {
	this.ps        = null;
	this.cmd       = null;
	this.frameTime = 0;
	this.mins      = [0, 0, 0];
	this.maxs      = [0, 0, 0];
	//this.tracemask = 0;                          // collide against these surfaces
	//this.framecount = 0;

	// results (out)
	//this.numtouch = 0;
	//this.touchents = null; //[MAXTOUCH];
	this.xyspeed   = 0;

	// callbacks to test the world
	// these will be different functions during game and cgame
	this.trace     = null;
};