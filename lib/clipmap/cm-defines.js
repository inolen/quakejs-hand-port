var MAX_SUBMODELS        = 256;
var BOX_MODEL_HANDLE     = 255;
var CAPSULE_MODEL_HANDLE = 254;

// Keep 1/8 unit away to keep the position valid before network snapping
// and to avoid various numeric issues.
var SURFACE_CLIP_EPSILON = 0.125;

var ClipMapLocals = function () {
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
	this.entities     = null;
	this.surfaces     = null;                              // only patches

	this.visibility   = null;
	this.numClusters  = 0;
	this.clusterBytes = 0;

	this.areas        = null;
	this.areaPortals  = null;                              // [ numAreas*numAreas ] reference counts
	
	this.floodvalid   = 0;
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
	this.leaf = new cleaf_t();                             // submodels don't reference the main tree
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
	this.shaderNum  = 0;                                    // the shader that determined the contents
	this.contents   = 0;
	this.bounds     = [[0, 0, 0], [0, 0, 0]];
	this.firstSide  = 0;
	this.numSides   = 0;
	this.checkcount = 0;                                   // to avoid repeated testings
};

var carea_t = function () {
	this.floodnum   = 0;
	this.floodvalid = 0;
};

/**********************************************************
 * Polylib
 **********************************************************/
var winding_t = function () {
	this.p = [];
};

winding_t.prototype.clone = function (to) {
	if (typeof(to) === 'undefined') {
		to = new winding_t();
	}

	to.p = new Array(this.p.length);
	for (var i = 0; i < this.p.length; i++) {
		to.p[i] = vec3.set(this.p[i], [0, 0, 0]);
	}

	return to;
};

var MAX_POINTS_ON_WINDING = 64;

var SIDE_FRONT = 0;
var SIDE_BACK  = 1;
var SIDE_ON    = 2;
var SIDE_CROSS = 3;

var MAX_MAP_BOUNDS = 65535;

/**********************************************************
 * Patch clipping
 **********************************************************/
var MAX_FACETS         = 1024;
var MAX_PATCH_VERTS    = 1024;
var MAX_PATCH_PLANES   = 2048;
var MAX_GRID_SIZE      = 129;
var SUBDIVIDE_DISTANCE = 16;                               // never more than this units away from curve
var PLANE_TRI_EPSILON  = 0.1;
var WRAP_POINT_EPSILON = 0.1;

var pplane_t = function () {
	this.plane    = [0, 0, 0, 0];
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
		[0, 0, 0],
		[0, 0, 0]
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
			this.points[i][j] = [0, 0, 0];
		}
	}
};

var cpatch_t = function () {
	this.checkcount   = 0;                                 // to avoid repeated testings
	this.surfaceFlags = 0;
	this.contents     = 0;
	this.pc           = null;
};

/**********************************************************
 * Tracing
 **********************************************************/
var TraceResults = function () {
	this.allSolid     = false;                             // if true, plane is not valid
	this.startSolid   = false;                             // if true, the initial point was in a solid area
	this.fraction     = 1.0;                               // time completed, 1.0 = didn't hit anything
	this.endPos       = [0, 0, 0];                         // final position
	this.plane        = new QMath.Plane();                 // surface normal at impact, transformed to world space
	this.surfaceFlags = 0;
	this.contents     = 0;
	this.entityNum    = 0;
	this.shaderName   = null;                              // debugging
};

TraceResults.prototype.clone = function (to) {
	if (typeof(to) === 'undefined') {
		to = new TraceResults();
	}

	to.allSolid = this.allSolid;
	to.startSolid = this.startSolid;
	to.fraction = this.fraction;
	vec3.set(this.endPos, to.endPos);
	this.plane.clone(to.plane);
	to.surfaceFlags = this.surfaceFlags;
	to.contents = this.contents;
	to.entityNum = this.entityNum;
	to.shaderName = this.shaderName;

	return to;
};

var MAX_POSITION_LEAFS = 1024;

var LeafList = function () {
	this.list     = null;
	this.count    = 0;
	this.maxCount = 0;
	this.lastLeaf = 0;                                     // for overflows where each leaf can't be stored individually
};

// Used for oriented capsule collision detection
var Sphere = function () {
	this.use        = false;
	this.radius     = 0;
	this.halfheight = 0;
	this.offset     = [0, 0, 0];
};

Sphere.prototype.clone = function (to) {
	if (typeof(to) === 'undefined') {
		to = new Sphere();
	}

	to.use = this.use;
	to.radius = this.radius;
	to.halfheight = this.halfheight;
	vec3.set(this.offset, to.offset);
};

var TraceWork = function () {
	this.trace     = new TraceResults();
	this.start     = [0, 0, 0];
	this.end       = [0, 0, 0];
	this.size      = [                                     // size of the box being swept through the model
		[0, 0, 0],
		[0, 0, 0]
	];
	this.offsets   = [                                     // [signbits][x] = either size[0][x] or size[1][x]
		[0, 0, 0],
		[0, 0, 0],
		[0, 0, 0],
		[0, 0, 0],
		[0, 0, 0],
		[0, 0, 0],
		[0, 0, 0],
		[0, 0, 0]
	];
	this.maxOffset = 0;                                    // longest corner length from origin
	this.extents   = [0, 0, 0];                            // greatest of abs(size[0]) and abs(size[1])
	this.bounds    = [                                     // enclosing box of start and end surrounding by size
		[0, 0, 0],
		[0, 0, 0]
	];
	this.contents  = 0;                                    // ored contents of the model tracing through
	this.isPoint   = false;                                // optimized case
	this.sphere    = new Sphere();                         // sphere for oriendted capsule collision
};