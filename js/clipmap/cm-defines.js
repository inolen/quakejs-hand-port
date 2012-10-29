var MAX_SUBMODELS        = 256;
var BOX_MODEL_HANDLE     = 255;
var CAPSULE_MODEL_HANDLE = 254;

// keep 1/8 unit away to keep the position valid before network snapping
// and to avoid various numeric issues
var SURFACE_CLIP_EPSILON = 0.125;

var ClipMapLocals = function () {
	this.shaders     = null;
	this.brushes     = null;
	this.models      = null;
	this.leafs       = null;
	this.leafBrushes = null;
	this.nodes       = null;
	this.planes      = null;
	this.shaders     = null;
	this.entities    = null;
};

/**********************************************************
 * Clipmap specific BSP structs
 **********************************************************/
var cnode_t = function () {
	this.planeNum    = 0;
	this.childrenNum = [0, 0];
};

var cmodel_t = function () {
	this.mins = [0, 0, 0];
	this.maxs = [0, 0, 0];
	this.leaf = null;                            // submodels don't reference the main tree
};

var cleaf_t = function () {
	this.cluster          = 0;
	this.area             = 0;
	this.firstLeafSurface = 0;
	this.numLeafSurfaces  = 0;
	this.firstLeafBrush   = 0;
	this.numLeafBrushes   = 0;
};

var cbrushside_t = function () {
	this.plane        = null;
	this.surfaceFlags = 0;
	this.shaderNum    = 0;
};

var cbrush_t = function () {
	this.shaderNum = 0;                          // the shader that determined the contents
	this.contents  = 0;
	this.bounds    = [[0, 0, 0], [0, 0, 0]];
	this.numsides  = 0;
	this.sides     = null;
	this.checkcount = 0;                         // to avoid repeated testings
};

/**********************************************************
 * Tracing
 **********************************************************/
var TraceResults = function () {
	this.allSolid   = false;                     // if true, plane is not valid
	this.startSolid = false;                     // if true, the initial point was in a solid area
	this.fraction   = 1.0;                       // time completed, 1.0 = didn't hit anything
	this.endPos     = vec3.create();             // final position
	this.plane      = null;                      // surface normal at impact, transformed to world space
};

TraceResults.prototype.clone = function (to) {
	if (typeof(to) === 'undefined') {
		to = new TraceResults();
	}

	to.allSolid = this.allSolid;
	to.startSolid = this.startSolid;
	to.fraction = this.fraction;
	vec3.set(this.endPos, to.endPos);
	to.plane = this.plane;

	return to;
}

var MAX_POSITION_LEAFS = 1024;

var LeafList = function () {
	this.list  = new Uint32Array(MAX_POSITION_LEAFS);
	this.count = 0;
};

// Used for oriented capsule collision detection
var Sphere = function () {
	this.use        = false;
	this.radius     = 0;
	this.halfheight = 0;
	this.offset     = [0, 0, 0];
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