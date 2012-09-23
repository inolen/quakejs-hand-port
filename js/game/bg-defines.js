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
	//void		(*trace)( trace_t *results, const vec3_t start, const vec3_t mins, const vec3_t maxs, const vec3_t end, int passEntityNum, int contentMask );
	//int			(*pointcontents)( const vec3_t point, int passEntityNum );
};