var MAX_DRAWSURFS = 0x10000;
var DRAWSURF_MASK = (MAX_DRAWSURFS-1);

var ENTITYNUM_BITS = 10;// can't be increased without changing drawsurf bit packing
var MAX_ENTITIES   = (1 << ENTITYNUM_BITS) - 1;

var SS_BAD            = 0;
var SS_PORTAL         = 1;                       // mirrors, portals, viewscreens
var SS_ENVIRONMENT    = 2;                       // sky box
var SS_OPAQUE         = 3;                       // opaque
var SS_DECAL          = 4;                       // scorch marks, etc.
var SS_SEE_THROUGH    = 5;                       // ladders, grates, grills that may have small blended
                                                 // edges in addition to alpha test
var SS_BANNER         = 6;
var SS_FOG            = 7;
var SS_UNDERWATER     = 8;                       // for items that should be drawn in front of the water plane
var SS_BLEND0         = 9;                       // regular transparency and filters
var SS_BLEND1         = 10;                      // generally only used for additive type effects
var SS_BLEND2         = 11;
var SS_BLEND3         = 12;
var SS_BLEND6         = 13;
var SS_STENCIL_SHADOW = 14;
var SS_ALMOST_NEAREST = 15;                      // gun smoke puffs
var SS_NEAREST        = 16;                      // blood blobs

var LIGHTMAP_2D         = -4; // shader is for 2D rendering
var LIGHTMAP_BY_VERTEX  = -3; // pre-lit triangle models
var LIGHTMAP_WHITEIMAGE = -2;
var LIGHTMAP_NONE       = -1;

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

var DrawSurface = function () {
	this.sort    = 0;                            // bit combination for fast compares
	this.surface = -1;                           // any of surface*_t
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
	this.time         = 0 ;
	// TODO maybe this shouldn't be initialized until we hit the renderer.
	this.drawSurfs    = new Array(MAX_DRAWSURFS);
	this.numDrawSurfs = 0;
	for (var i = 0; i < MAX_DRAWSURFS; i++) {
		this.drawSurfs[i] = new DrawSurface();
	}
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
