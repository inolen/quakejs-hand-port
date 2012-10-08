// content masks
var MASK_ALL                    = -1;
var MASK_SOLID                  = CONTENTS_SOLID;
var MASK_PLAYERSOLID            = CONTENTS_SOLID | CONTENTS_PLAYERCLIP | CONTENTS_BODY;
var MASK_DEADSOLID              = CONTENTS_SOLID | CONTENTS_PLAYERCLIP;
var MASK_WATER                  = CONTENTS_WATER | CONTENTS_LAVA | CONTENTS_SLIME
var MASK_OPAQUE                 = CONTENTS_SOLID | CONTENTS_SLIME | CONTENTS_LAVA;
var MASK_SHOT                   = CONTENTS_SOLID | CONTENTS_BODY | CONTENTS_CORPSE;

var PMF_DUCKED                  = 1;
var PMF_JUMP_HELD               = 2;
var PMF_BACKWARDS_JUMP          = 8;             // go into backwards land
var PMF_BACKWARDS_RUN           = 16;            // coast down to backwards run
var PMF_TIME_LAND               = 32;            // pm_time is time before rejump
var PMF_TIME_KNOCKBACK          = 64;            // pm_time is an air-accelerate only time
var PMF_TIME_WATERJUMP          = 256;           // pm_time is waterjump
var PMF_RESPAWNED               = 512;           // clear after attack and jump buttons come up
var PMF_USE_ITEM_HELD           = 1024;
var PMF_GRAPPLE_PULL            = 2048;          // pull towards grapple location
var PMF_FOLLOW                  = 4096;          // spectate following another player
var PMF_SCOREBOARD              = 8192;          // spectate as a scoreboard
var PMF_INVULEXPAND             = 16384;         // invulnerability sphere set to full size

var JUMP_VELOCITY = 270;
var MAX_CLIP_PLANES = 5;
var MIN_WALK_NORMAL = 0.7;
var STEPSIZE = 18;
var OVERCLIP = 1.001;
var DEFAULT_VIEWHEIGHT = 26;

var TrType = {
	TR_STATIONARY:  1,
	TR_INTERPOLATE: 2,                           // non-parametric, but interpolate between snapshots
	TR_LINEAR:      3,
	TR_LINEAR_STOP: 4,
	TR_SINE:        5,                           // value = base + sin( time / duration ) * delta
	TR_GRAVITY:     6
};

var Trajectory = function () {
	this.type = 0;
	this.time = 0;
	this.duration = 0;
	this.base = [0, 0, 0];
	this.delta = [0, 0, 0];
};

var PmoveType = {
	NORMAL:       0,                             // can accelerate and turn
	NOCLIP:       1,                             // noclip movement
	SPECTATOR:    2,                             // still run into walls
	DEAD:         3,                             // no acceleration or turning, but free falling
	FREEZE:       4,                             // stuck in place with no control
	INTERMISSION: 5                              // no movement or status bar
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