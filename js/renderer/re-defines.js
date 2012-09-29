var MAX_DRAWSURFS = 0x10000;
var DRAWSURF_MASK = (MAX_DRAWSURFS-1);

var RenderLocals = function () {
	this.world         = null;
	this.refdef        = new RefDef();
	this.viewParms     = null;
	this.visCount      = 0;                      // incremented every time a new vis cluster is entered
	this.frameCount    = 0;                      // incremented every frame
	this.sceneCount    = 0;                      // incremented every scene
	this.viewCount     = 0;                      // incremented every view (twice a scene if portaled)
	this.frameSceneNum = 0;                      // zeroed at RE_BeginFrame
	this.pc            = new PerformanceCounter();
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

var Texture = function () {
	this.name   = null;
	this.texnum = null;
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
	this.fov          = 0;
	this.vieworg      = vec3.create();
	this.viewaxis     = [
		vec3.create(),
		vec3.create(),
		vec3.create()
	];
	// TODO maybe this shouldn't be initialized until we hit the renderer.
	this.drawSurfs    = new Array(MAX_DRAWSURFS);
	this.numDrawSurfs = 0;
	for (var i = 0; i < MAX_DRAWSURFS; i++) {
		this.drawSurfs[i] = new DrawSurface();
	}
};

var Orientation = function () {
	this.origin      = vec3.create();
	this.viewaxis    = [
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
	this.fov              = 0;
	this.projectionMatrix = mat4.create();
	this.frameSceneNum    = 0;
	this.frameCount       = 0;
};