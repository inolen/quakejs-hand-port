var MAX_SUBMODELS        = 256;
var BOX_MODEL_HANDLE     = 255;

// Keep 1/8 unit away to keep the position valid before network snapping
// and to avoid various numeric issues.
var SURFACE_CLIP_EPSILON = 0.125;

var ClipWorld = function () {
	this.shaders      = null;
	this.brushes      = null;
	this.brushSides   = null;
	this.models       = null;
	this.leafs        = null;
	this.leafBrushes  = null;
	this.leafSurfaces = null;
	this.nodes        = null;
	this.planes       = null;
	this.shaders      = null;
	this.surfaces     = null;                              // only patches

	this.visibility   = null;
	this.numClusters  = 0;
	this.clusterBytes = 0;

	this.areas        = null;
	this.areaPortals  = null;                              // [ numAreas*numAreas ] reference counts

	this.floodValid   = 0;
};

/**********************************************************
 *
 * Clipmap specific BSP structs
 *
 **********************************************************/
var ClipModel = function () {
	this.mins = vec3.create();
	this.maxs = vec3.create();
	this.leaf = new BSPLoader.dleaf_t();               // submodels don't reference the main tree
};

var ClipBrushSide = function () {
	this.plane        = null;
	this.surfaceFlags = 0;
};

var ClipBrush = function () {
	this.shader     = 0;                                    // the shader that determined the contents
	this.contents   = 0;
	this.bounds     = [vec3.create(), vec3.create()];
	this.firstSide  = 0;
	this.numSides   = 0;
	this.checkcount = 0;                                   // to avoid repeated testings
};

var ClipArea = function () {
	this.floodnum   = 0;
	this.floodValid = 0;
};

/**********************************************************
 *
 * Tracing
 *
 **********************************************************/
var MAX_POSITION_LEAFS = 1024;

var LeafList = function () {
	this.list     = null;
	this.count    = 0;
	this.maxCount = 0;
	this.lastLeaf = 0;                                     // for overflows where each leaf can't be stored individually
};

var TraceWork = function () {
	this.trace     = new QS.TraceResults();
	this.start     = vec3.create();
	this.end       = vec3.create();
	this.size      = [                                     // size of the box being swept through the model
		vec3.create(),
		vec3.create()
	];
	this.offsets   = [                                     // [signbits][x] = either size[0][x] or size[1][x]
		vec3.create(),
		vec3.create(),
		vec3.create(),
		vec3.create(),
		vec3.create(),
		vec3.create(),
		vec3.create(),
		vec3.create()
	];
	this.extents   = vec3.create();                        // greatest of abs(size[0]) and abs(size[1])
	this.bounds    = [                                     // enclosing box of start and end surrounding by size
		vec3.create(),
		vec3.create()
	];
	this.contents  = 0;                                    // ored contents of the model tracing through
	this.isPoint   = false;                                // optimized case
};

TraceWork.prototype.reset = function () {
	this.trace.reset();

	this.start[0] = this.start[1] = this.start[2] = 0.0;
	this.end[0] = this.end[1] = this.end[2] = 0.0;

	for (var i = 0; i < this.size.length; i++) {
		this.size[i][0] = this.size[i][1] = this.size[i][2] = 0.0;
	}

	for (var i = 0; i < this.offsets.length; i++) {
		this.offsets[i][0] = this.offsets[i][1] = this.offsets[i][2] = 0.0;
	}

	this.extents[0] = this.extents[1] = this.extents[2] = 0.0;

	for (var i = 0; i < this.bounds.length; i++) {
		this.bounds[i][0] = this.bounds[i][1] = this.bounds[i][2] = 0.0;
	}

	this.contents = 0;
	this.isPoint = false;
};


/**********************************************************
 *
 * Patch clipping
 *
 **********************************************************/
var MAX_FACETS         = 1024;
var MAX_PATCH_VERTS    = 1024;
var MAX_PATCH_PLANES   = 2048;
var MAX_GRID_SIZE      = 129;
var SUBDIVIDE_DISTANCE = 16;                               // never more than this units away from curve
var WRAP_POINT_EPSILON = 0.1;

var pplane_t = function () {
	this.plane    = vec4.create();
	this.signbits = 0;                                     // signx + (signy<<1) + (signz<<2), used as lookup during collision
};

var pfacet_t = function () {
	this.surfacePlane = 0;
	this.numBorders   = 0;                                 // 3 or four + 6 axial bevels + 4 or 3 * 4 edge bevels
	this.borderPlanes = [
		0, 0, 0, 0,
		0, 0, 0, 0, 0, 0,
		0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0
	];
	this.borderInward = [
		0, 0, 0, 0,
		0, 0, 0, 0, 0, 0,
		0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0
	];
	this.borderNoAdjust = [
		false, false, false, false,
		false, false, false, false, false, false,
		false, false, false, false, false, false, false, false, false, false, false, false, false, false, false, false
	];
};

var pcollide_t = function () {
	this.bounds = [
		vec3.create(),
		vec3.create()
	];
	this.planes = [];                                      // surface planes plus edge planes
	this.facets = [];
};

var cgrid_t = function () {
	this.width      = 0;
	this.height     = 0;
	this.wrapWidth  = 0;
	this.wrapHeight = 0;
	this.points     = new Array(MAX_GRID_SIZE);

	for (var i = 0; i < MAX_GRID_SIZE; i++) {
		this.points[i] = new Array(MAX_GRID_SIZE);

		for (var j = 0; j < MAX_GRID_SIZE; j++) {
			this.points[i][j] = vec3.create();
		}
	}
};

var cpatch_t = function () {
	this.checkcount   = 0;                                 // to avoid repeated testings
	this.surfaceFlags = 0;
	this.contents     = 0;
	this.pc           = null;
};