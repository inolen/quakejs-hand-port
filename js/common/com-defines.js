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
	this.commandTime = 0;
	this.origin = [0, 0, 0];
	this.velocity = [0, 0, 0];
	this.viewangles = [0, 0, 0];
	this.speed = 0;
	this.gracity = 0;
	this.groundEntityNum = -1;
	this.pm_flags = 0;
};

/**
 * OLD BG
 */
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
	//this.tracemask = 0; // collide against these surfaces
	//this.framecount = 0;

	// results (out)
	//this.numtouch = 0;
	//this.touchents = null; //[MAXTOUCH];
	//this.mins = [0, 0, 0];
	//this.maxs = [0, 0, 0];

	// callbacks to test the world
	// these will be different functions during game and cgame
	this.trace = null;
	//void		(*trace)( trace_t *results, const vec3_t start, const vec3_t mins, const vec3_t maxs, const vec3_t end, int passEntityNum, int contentMask );
	//int			(*pointcontents)( const vec3_t point, int passEntityNum );
};