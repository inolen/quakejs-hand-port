var Q3W_BASE_FOLDER = 'baseq3';

var PACKET_BACKUP = 32; // number of old messages that must be kept on client and
						// server for delta comrpession and ping estimation
var PACKET_MASK = (PACKET_BACKUP-1);

/**
 * NETWORKING
 */
var NetAdr = {
	type: 0,
	ip: null,
	port: 0
};

var NetAdrType = {
	NA_BAD: 0,
	NA_LOOPBACK: 1,
	NA_IP: 2
};

var NetSrc = {
	NS_CLIENT: 0,
	NS_SERVER: 1
};

/**
 * GAMESTATE
 */
var PlayerState = function () {
	this.commandTime = 0;			// cmd->serverTime of last executed command
	this.origin = [0, 0, 0];
	this.velocity = [0, 0, 0];
	this.viewangles = [0, 0, 0];
	this.speed = 0;
	this.gracity = 0;
	this.groundEntityNum = -1;		// ENTITYNUM_NONE = in air
	this.pm_flags = 0;				// ducked, jump_held, etc
};

/**
 * Surface flags
 */
var CONTENTS_SOLID				= 1;			// an eye is never valid in a solid
var CONTENTS_LAVA				= 8;
var CONTENTS_SLIME				= 16;
var CONTENTS_WATER				= 32;
var CONTENTS_FOG				= 64;

var CONTENTS_NOTTEAM1			= 0x0080;
var CONTENTS_NOTTEAM2			= 0x0100;
var CONTENTS_NOBOTCLIP			= 0x0200;

var CONTENTS_AREAPORTAL			= 0x8000;

var CONTENTS_PLAYERCLIP			= 0x10000;
var CONTENTS_MONSTERCLIP		= 0x20000;
//bot specific contents types
var CONTENTS_TELEPORTER			= 0x40000;
var CONTENTS_JUMPPAD			= 0x80000;
var CONTENTS_CLUSTERPORTAL		= 0x100000;
var CONTENTS_DONOTENTER			= 0x200000;
var CONTENTS_BOTCLIP			= 0x400000;
var CONTENTS_MOVER				= 0x800000;

var CONTENTS_ORIGIN				= 0x1000000;	// removed before bsping an entity

var CONTENTS_BODY				= 0x2000000;	// should never be on a brush, only in game
var CONTENTS_CORPSE				= 0x4000000;
var CONTENTS_DETAIL				= 0x8000000;	// brushes not used for the bsp
var CONTENTS_STRUCTURAL			= 0x10000000;	// brushes used for the bsp
var CONTENTS_TRANSLUCENT		= 0x20000000;	// don't consume surface fragments inside
var CONTENTS_TRIGGER			= 0x40000000;
var CONTENTS_NODROP				= 0x80000000;	// don't leave bodies or items (death fog, lava)

var SURF_NODAMAGE				= 0x1;			// never give falling damage
var SURF_SLICK					= 0x2;			// effects game physics
var SURF_SKY					= 0x4;			// lighting from environment map
var SURF_LADDER					= 0x8;
var SURF_NOIMPACT				= 0x10;			// don't make missile explosions
var SURF_NOMARKS				= 0x20;			// don't leave missile marks
var SURF_FLESH					= 0x40;			// make flesh sounds and effects
var SURF_NODRAW					= 0x80;			// don't generate a drawsurface at all
var SURF_HINT					= 0x100;		// make a primary bsp splitter
var SURF_SKIP					= 0x200;		// completely ignore, allowing non-closed brushes
var SURF_NOLIGHTMAP				= 0x400;		// surface doesn't need a lightmap
var SURF_POINTLIGHT				= 0x800;		// generate lighting info at vertexes
var SURF_METALSTEPS				= 0x1000;		// clanking footsteps
var SURF_NOSTEPS				= 0x2000;		// no footstep sounds
var SURF_NONSOLID				= 0x4000;		// don't collide against curves with this set
var SURF_LIGHTFILTER			= 0x8000;		// act as a light filter during q3map -light
var SURF_ALPHASHADOW			= 0x10000;		// do per-pixel light shadow casting in q3map
var SURF_NODLIGHT				= 0x20000;		// don't dlight even if solid (solid lava, skies)
var SURF_DUST					= 0x40000;		// leave a dust trail when walking on this surface



/**
 * OLD BG
 */

// content masks
var MASK_ALL					= -1;
var MASK_SOLID 					= CONTENTS_SOLID;
var MASK_PLAYERSOLID			= CONTENTS_SOLID | CONTENTS_PLAYERCLIP | CONTENTS_BODY;
var MASK_DEADSOLID				= CONTENTS_SOLID | CONTENTS_PLAYERCLIP;
var MASK_WATER					= CONTENTS_WATER | CONTENTS_LAVA | CONTENTS_SLIME
var MASK_OPAQUE					= CONTENTS_SOLID | CONTENTS_SLIME | CONTENTS_LAVA;
var MASK_SHOT					= CONTENTS_SOLID | CONTENTS_BODY | CONTENTS_CORPSE;

/*var PMF_DUCKED	s		= 1;*/
var PMF_JUMP_HELD			= 2;
/*var PMF_BACKWARDS_JUMP	= 8;	// go into backwards land
var PMF_BACKWARDS_RUN		= 16;	// coast down to backwards run
var PMF_TIME_LAND			= 32;	// pm_time is time before rejump
var PMF_TIME_KNOCKBACK		= 64;	// pm_time is an air-accelerate only time
var PMF_TIME_WATERJUMP		= 256;	// pm_time is waterjump
var PMF_RESPAWNED			= 512;	// clear after attack and jump buttons come up
var PMF_USE_ITEM_HELD		= 1024;
var PMF_GRAPPLE_PULL		= 2048;	// pull towards grapple location
var PMF_FOLLOW				= 4096;	// spectate following another player
var PMF_SCOREBOARD			= 8192;	// spectate as a scoreboard
var PMF_INVULEXPAND			= 16384	// invulnerability sphere set to full size*/

var ENTITYNUM_NONE = -1;
var JUMP_VELOCITY = 270;
var MAX_CLIP_PLANES = 5;
var MIN_WALK_NORMAL = 0.7;
var STEPSIZE = 18;
var OVERCLIP = 1.001;
var DEFAULT_VIEWHEIGHT = 26;

var TrType = {
	TR_STATIONARY: 1,
	TR_INTERPOLATE: 2, // non-parametric, but interpolate between snapshots
	TR_LINEAR: 3,
	TR_LINEAR_STOP: 4,
	TR_SINE: 5,        // value = base + sin( time / duration ) * delta
	TR_GRAVITY: 6
};

var Trajectory = function () {
	this.type = 0;
	this.time = 0;
	this.duration = 0;
	this.base = [0, 0, 0];
	this.delta = [0, 0, 0];
};

var PmoveInfo = function () {
	this.ps = null;
	this.cmd = null;
	this.frameTime = 0;
	this.mins = [0, 0, 0];
	this.maxs = [0, 0, 0];
	//this.tracemask = 0; // collide against these surfaces
	//this.framecount = 0;

	// results (out)
	//this.numtouch = 0;
	//this.touchents = null; //[MAXTOUCH];

	// callbacks to test the world
	// these will be different functions during game and cgame
	this.trace = null;
};