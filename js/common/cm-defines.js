// keep 1/8 unit away to keep the position valid before network snapping
// and to avoid various numeric issues
var SURFACE_CLIP_EPSILON = 0.125;

var ClipMap = function () {
	this.shaders     = null;
	this.brushes     = null;
	this.cmodels     = null;
	this.leafs       = null;
	this.leafBrushes = null;
	this.nodes       = null;
	this.planes      = null;
	this.shaders     = null;
	this.entities    = null;
};

var TraceResults = function () {
	this.allSolid   = false;                     // if true, plane is not valid
	this.startSolid = false;                     // if true, the initial point was in a solid area
	this.fraction   = 1.0;                       // time completed, 1.0 = didn't hit anything
	this.endPos     = vec3.create();             // final position
	this.plane      = null;                      // surface normal at impact, transformed to world space
};

var MAX_POSITION_LEAFS = 1024;

var LeafList = function () {
	this.list  = new Uint32Array(MAX_POSITION_LEAFS);
	this.count = 0;
};

var TraceWork = function () {
	this.trace     = new TraceResults();
	this.start     = vec3.create();
	this.end       = vec3.create();
	this.size      = [                           // size of the box being swept through the model
		vec3.create(),
		vec3.create()
	];
	this.offsets   = [                           // [signbits][x] = either size[0][x] or size[1][x]
		vec3.create(),
		vec3.create(),
		vec3.create(),
		vec3.create(),
		vec3.create(),
		vec3.create(),
		vec3.create(),
		vec3.create()
	];
	this.maxOffset = 0;                          // longest corner length from origin
	this.extents   = vec3.create();              // greatest of abs(size[0]) and abs(size[1])
	this.bounds    = [                           // enclosing box of start and end surrounding by size
		vec3.create(),
		vec3.create()
	];
	this.contents  = 0;                          // ored contents of the model tracing through
	this.isPoint   = false;                      // optimized case
};