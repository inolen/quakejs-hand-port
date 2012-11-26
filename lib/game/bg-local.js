var DEFAULT_GRAVITY = 800;

var JUMP_VELOCITY = 270;
var MAX_CLIP_PLANES = 5;
var MIN_WALK_NORMAL = 0.7;
var STEPSIZE = 18;
var OVERCLIP = 1.001;
var DEFAULT_VIEWHEIGHT = 26;

var PmoveLocals = function () {
	this.reset();
};

PmoveLocals.prototype.reset = function () {
	this.forward             = [0, 0, 0];
	this.right               = [0, 0, 0];
	this.up                  = [0, 0, 0];
	
	this.frameTime           = 0;
	this.msec                = 0;

	this.walking             = false;
	this.groundPlane         = false;
	this.groundTrace         = null; // TODO pre-alloc

	this.impactSpeed         = 0;

	this.previous_origin     = [0, 0, 0];
	this.previous_velocity   = [0, 0, 0];
	this.previous_waterlevel = 0;
};

var PmoveInfo = function () {
	this.ps         = null;
	this.cmd        = new sh.UserCmd();
	this.mins       = [0, 0, 0];
	this.maxs       = [0, 0, 0];
	this.tracemask  = 0;                                   // collide against these surfaces
	//this.framecount = 0;

	// results (out)
	//this.numtouch = 0;
	//this.touchents = null; //[MAXTOUCH];
	this.xyspeed    = 0;
	this.watertype  = 0;
	this.waterlevel = 0;

	// callbacks to test the world
	// these will be different functions during game and cgame
	this.trace      = null;
};

var GameItemDesc = function (classname, pickupSound, models, icon, pickupName, quantity, giType, giTag, precache, sounds) {
	this.classname   = classname;                           // spawning name
	this.pickupSound = pickupSound;
	this.models      = models;
	this.icon        = icon;
	this.pickupName  = pickupName;
	this.quantity    = quantity;
	this.giType      = giType;                              // IT_* flags
	this.giTag       = giTag;
	this.precache    = precache;
	this.sounds      = sounds;
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