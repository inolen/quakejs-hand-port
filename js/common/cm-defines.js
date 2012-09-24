// keep 1/8 unit away to keep the position valid before network snapping
// and to avoid various numeric issues
var SURFACE_CLIP_EPSILON = 0.125;

var ClipMap = function () {
	this.shaders = null;
	this.brushes = null;
	this.leaves = null;
	this.leafBrushes = null;
	this.nodes = null;
	this.planes = null;
	this.shaders = null;
	this.entities = null;
};

var TraceResults = function () {
	this.allSolid = false;		// if true, plane is not valid
	this.startSolid = false;	// if true, the initial point was in a solid area
	this.fraction = 1.0;		// time completed, 1.0 = didn't hit anything
	this.endPos = [0, 0, 0];	// final position
	this.plane = null;			// surface normal at impact, transformed to world space
};

var TraceWork = function () {
	this.trace = new TraceResults();
	this.start = [0, 0, 0];
	this.end = [0, 0, 0];
	this.size = [				// size of the box being swept through the model
		[0, 0, 0],
		[0, 0, 0]
	];
	this.offsets = [			// [signbits][x] = either size[0][x] or size[1][x]
		[0, 0, 0],
		[0, 0, 0],
		[0, 0, 0],
		[0, 0, 0],
		[0, 0, 0],
		[0, 0, 0],
		[0, 0, 0],
		[0, 0, 0]
	];
	this.maxOffset = 0;			// longest corner length from origin
	this.extents = [0, 0, 0];	// greatest of abs(size[0]) and abs(size[1])
	this.bounds = [				// enclosing box of start and end surrounding by size
		[0, 0, 0],
		[0, 0, 0]
	];
	this.contents = 0;			// ored contents of the model tracing through
	this.isPoint = false;		// optimized case
};