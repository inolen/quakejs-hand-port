var DEFAULT_GRAVITY = 800;
var JUMP_VELOCITY = 270;
var MAX_CLIP_PLANES = 5;
var MIN_WALK_NORMAL = 0.7;
var STEPSIZE = 18;
var OVERCLIP = 1.001;
var DEFAULT_VIEWHEIGHT = 26;

var PmoveInfo = function () {
	this.ps        = null;
	this.cmd       = null;
	this.frameTime = 0;
	this.mins      = [0, 0, 0];
	this.maxs      = [0, 0, 0];
	//this.tracemask = 0;                                    // collide against these surfaces
	//this.framecount = 0;

	// results (out)
	//this.numtouch = 0;
	//this.touchents = null; //[MAXTOUCH];
	this.xyspeed   = 0;

	// callbacks to test the world
	// these will be different functions during game and cgame
	this.trace     = null;
};

var GameItemDesc = function (classname, modelPaths, icon, quantity, giType, giTag) {
	this.classname  = classname;                           // spawning name
	this.modelPaths = modelPaths;
	this.icon       = icon;
	this.quantity   = quantity;
	this.giType     = giType;                              // IT_* flags
	this.giTag      = giTag;
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
