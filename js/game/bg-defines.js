var JUMP_VELOCITY = 270;
var MAX_CLIP_PLANES = 5;
var MIN_WALK_NORMAL = 0.7;
var STEPSIZE = 18;
var OVERCLIP = 1.001;
var DEFAULT_VIEWHEIGHT = 26;
var ITEM_RADIUS = 15;                            // item sizes are needed for client side pickup detection

/*
var TrType = {
	STATIONARY:  1,
	INTERPOLATE: 2,                              // non-parametric, but interpolate between snapshots
	LINEAR:      3,
	LINEAR_STOP: 4,
	SINE:        5,                              // value = base + sin( time / duration ) * delta
	GRAVITY:     6
};

var Trajectory = function () {
	this.type = 0;
	this.time = 0;
	this.duration = 0;
	this.base = [0, 0, 0];
	this.delta = [0, 0, 0];
};*/

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

var GameItemDesc = function (classname, giType) {
	this.classname = classname;                  // spawning name
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
var ContentFlags = {
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
	SOLID:       ContentFlags.SOLID,
	PLAYERSOLID: ContentFlags.SOLID | ContentFlags.PLAYERCLIP  | ContentFlags.BODY,
	DEADSOLID:   ContentFlags.SOLID | ContentFlags.PLAYERCLIP,
	WATER:       ContentFlags.WATER | ContentFlags.LAVA        | ContentFlags.SLIME,
	OPAQUE:      ContentFlags.SOLID | ContentFlags.SLIME       | ContentFlags.LAVA,
	SHOT:        ContentFlags.SOLID | ContentFlags.BODY       | ContentFlags.CORPSE,
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
	INVULEXPAND:    16384                        // invulnerability sphere set to full size
};

var PmoveInfo = function () {
	this.ps = null;
	this.cmd = null;
	this.frameTime = 0;
	this.mins = [0, 0, 0];
	this.maxs = [0, 0, 0];
	//this.tracemask = 0;                          // collide against these surfaces
	//this.framecount = 0;

	// results (out)
	//this.numtouch = 0;
	//this.touchents = null; //[MAXTOUCH];

	// callbacks to test the world
	// these will be different functions during game and cgame
	this.trace = null;
};