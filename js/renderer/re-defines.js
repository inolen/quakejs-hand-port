var MAX_DRAWSURFS = 0x10000;
var DRAWSURF_MASK = (MAX_DRAWSURFS-1);

var ENTITYNUM_BITS = 10;// can't be increased without changing drawsurf bit packing
var MAX_ENTITIES   = (1 << ENTITYNUM_BITS) - 1;

/** 
 * The drawsurf sort data is packed into a single 32 bit value so it can be
 * compared quickly during the qsorting process.
 *
 * The bits are allocated as follows:
 * 0-1   : dlightmap index
 * 2-6   : fog index
 * 7-16  : entity index
 * 17-30 : sorted shader index
 */
var QSORT_FOGNUM_SHIFT    = 2;
var QSORT_ENTITYNUM_SHIFT = 7;
var QSORT_SHADERNUM_SHIFT = QSORT_ENTITYNUM_SHIFT + ENTITYNUM_BITS;

var RenderLocals = function () {
	this.parsedShaders   = {};
	this.compiledShaders = {};
	this.sortedShaders   = [];
	this.world           = null;
	this.refdef          = new RefDef();
	this.viewParms       = null;
	this.visCount        = 0;                    // incremented every time a new vis cluster is entered
	this.frameCount      = 0;                    // incremented every frame
	this.sceneCount      = 0;                    // incremented every scene
	this.viewCount       = 0;                    // incremented every view (twice a scene if portaled)
	this.frameSceneNum   = 0;                    // zeroed at RE_BeginFrame
	this.pc              = new PerformanceCounter();
};

var PerformanceCounter = function () {
	this.surfs = 0;
	this.leafs = 0;
	this.verts = 0;
};

var WorldData = function () {
	this.name         = null;
	this.path         = null;
	this.lightmaps    = null;
	this.shaders      = [];
	this.verts        = [];
	this.meshVerts    = [];
	this.faces        = [];
	this.planes       = [];
	this.leafSurfaces = [];
	this.nodes        = [];
	this.leafs        = [];
	this.entities     = {};
	this.numClusters  = 0;

	/*vec3_t    lightGridOrigin;
	vec3_t      lightGridSize;
	vec3_t      lightGridInverseSize;
	int         lightGridBounds[3];
	byte        *lightGridData;*/
};

var RefDef = function () {
	this.x            = 0;
	this.y            = 0;
	this.width        = 0;
	this.height       = 0;
	this.fovX         = 0;
	this.fovY         = 0;
	this.vieworg      = vec3.create();
	this.viewaxis     = [
		vec3.create(),
		vec3.create(),
		vec3.create()
	];
	// Time in milliseconds for shader effects and other time dependent rendering issues.
	this.time         = 0 ;
	// TODO maybe this shouldn't be initialized until we hit the renderer.
	this.drawSurfs    = new Array(MAX_DRAWSURFS);
	this.numDrawSurfs = 0;
	for (var i = 0; i < MAX_DRAWSURFS; i++) {
		this.drawSurfs[i] = new DrawSurface();
	}
};

var RefEntityType = {
	BBOX:          0,
	MODEL:         1,
	POLY:          2,
	SPRITE:        3,
	BEAM:          4,
	RAIL_CORE:     5,
	RAIL_RINGS:    6,
	LIGHTNING:     7,
	PORTALSURFACE: 8                             // doesn't draw anything, just info for portals
};

var RefEntity = function () {
	this.type   = 0;
	this.origin = vec3.create();
	this.mins   = vec3.create();
	this.maxs   = vec3.create();
};

var Orientation = function () {
	this.origin      = vec3.create();
	this.axis    = [
		vec3.create(),
		vec3.create(),
		vec3.create()
	];
	this.viewOrigin  = vec3.create();
	this.modelMatrix = mat4.create();
};

var ViewParms = function () {
	this.or               = new Orientation();
	this.world            = new Orientation();
	this.pvsOrigin        = vec3.create();          // may be different than or.origin for portals
	this.x                = 0;
	this.y                = 0;
	this.width            = 0;
	this.height           = 0;
	this.fovX             = 0;
	this.fovY             = 0;
	this.frustum          = [
		new Plane(),
		new Plane(),
		new Plane(),
		new Plane()
	];
	this.visBounds        = [
		vec3.create(),
		vec3.create()
	];
	this.zFar             = 0;
	this.projectionMatrix = mat4.create();
	this.frameSceneNum    = 0;
	this.frameCount       = 0;
};

var Texture = function () {
	this.name   = null;
	this.texnum = null;
};

var ShaderSort = {
	BAD:            0,
	PORTAL:         1,                           // mirrors, portals, viewscreens
	ENVIRONMENT:    2,                           // sky box
	OPAQUE:         3,                           // opaque
	DECAL:          4,                           // scorch marks, etc.
	SEE_THROUGH:    5,                           // ladders, grates, grills that may have small blended
	                                             // edges in addition to alpha test
	BANNER:         6,
	FOG:            7,
	UNDERWATER:     8,                           // for items that should be drawn in front of the water plane
	BLEND0:         9,                           // regular transparency and filters
	BLEND1:         10,                          // generally only used for additive type effects
	BLEND2:         11,
	BLEND3:         12,
	BLEND6:         13,
	STENCIL_SHADOW: 14,
	ALMOST_NEAREST: 15,                          // gun smoke puffs
	NEAREST:        16                           // blood blobs
};

var LightmapType = {
	UV:         -4,                              // shader is for 2D rendering
	VERTEX:     -3,                              // pre-lit triangle models
	WHITEIMAGE: -2,
	NONE:       -1
};

var SurfaceType = {
	BAD:          0,
	SKIP:         1,                             // ignore
	FACE:         2,
	GRID:         3,
	TRIANGLES:    4,
	POLY:         5,
	MD3:          6,
	MD4:          7,
	IQM:          8,
	FLARE:        9,
	ENTITY:       10,                            // beams, rails, lightning, etc that can be determined by entity
	DISPLAY_LIST: 11
};

var DrawSurface = function () {
	this.sort    = 0;                            // bit combination for fast compares
	this.surface = -1;                           // any of surface*_t
};

