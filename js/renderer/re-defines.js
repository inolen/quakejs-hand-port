var MAX_DRAWSURFS = 0x10000;
var DRAWSURF_MASK = (MAX_DRAWSURFS-1);

// surface geometry should not exceed these limits
var SHADER_MAX_VERTEXES = 1000;
var SHADER_MAX_INDEXES  = (6*SHADER_MAX_VERTEXES);

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
	this.world               = null;
	this.refdef              = new RefDef();
	this.viewParms           = null;
	this.visCount            = 0;                          // incremented every time a new vis cluster is entered
	this.frameCount          = 0;                          // incremented every frame
	this.sceneCount          = 0;                          // incremented every scene
	this.viewCount           = 0;                          // incremented every view (twice a scene if portaled)
	this.frameSceneNum       = 0;                          // zeroed at RE_BeginFrame

	// shaders
	this.shaderBodies        = {};
	this.programBodies       = {};
	this.compiledShaders     = {};
	this.sortedShaders       = [];
	this.defaultModelProgram = null;
	this.modelProgram        = null;
};

/**********************************************************
 * Describe a render frame
 **********************************************************/
var RefDef = function () {
	this.x              = 0;
	this.y              = 0;
	this.width          = 0;
	this.height         = 0;
	this.fovX           = 0;
	this.fovY           = 0;
	this.vieworg        = [0, 0, 0];
	this.viewaxis       = [
		[0, 0, 0],
		[0, 0, 0],
		[0, 0, 0]
	];
	// Time in milliseconds for shader effects and other time dependent rendering issues.
	this.time           = 0;
	this.drawSurfs      = new Array(MAX_DRAWSURFS);
	this.numDrawSurfs   = 0;
	this.refEntities    = new Array(MAX_ENTITIES);
	this.numRefEntities = 0;

	for (var i = 0; i < MAX_DRAWSURFS; i++) {
		this.drawSurfs[i] = new DrawSurface();
	}

	for (var i = 0; i < MAX_ENTITIES; i++) {
		this.refEntities[i] = new RefEntity();
	}
};

var DrawSurface = function () {
	this.sort    = 0;                                      // bit combination for fast compares
	this.surface = -1;                                     // any of surface*_t
};

var RefEntityType = {
	BBOX:                0,
	MODEL:               1,
	POLY:                2,
	SPRITE:              3,
	BEAM:                4,
	RAIL_CORE:           5,
	RAIL_RINGS:          6,
	LIGHTNING:           7,
	PORTALSURFACE:       8,                                // doesn't draw anything, just info for portals
	MAX_REF_ENTITY_TYPE: 9
};

var RefEntity = function () {
	this.reType = 0;
	this.origin = [0, 0, 0];
	this.axis   = [                                        // rotation vectors
		[0, 0, 0],
		[0, 0, 0],
		[0, 0, 0]
	]
	this.mins   = [0, 0, 0];
	this.maxs   = [0, 0, 0];
};

RefEntity.prototype.clone = function (refent) {
	if (typeof(refent) === 'undefined') {
		refent = new RefEntity();
	}

	refent.reType = this.reType;
	vec3.set(this.origin, refent.origin);
	mat3.set(this.axis, refent.axis);
	vec3.set(this.mins, refent.mins);
	vec3.set(this.maxs, refent.maxs);

	return refent;
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
	this.pvsOrigin        = vec3.create();                 // may be different than or.origin for portals
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

/************************************************
 * Renderer specific BSP structs
 ************************************************/
var SurfaceType = {
	BAD:          0,
	SKIP:         1,                                       // ignore
	FACE:         2,
	GRID:         3,
	TRIANGLES:    4,
	POLY:         5,
	MD3:          6,
	MD4:          7,
	IQM:          8,
	FLARE:        9,
	ENTITY:       10,                                      // beams, rails, lightning, etc that can be determined by entity
	DISPLAY_LIST: 11
};

var msurface_t = function () {
	this.surfaceType   = SurfaceType.BAD;
	this.viewCount     = 0;                                  // if == re.viewCount, already added
	this.shader        = null;
	this.fogIndex      = 0;
	this.vertex        = 0;
	this.vertCount     = 0;
	this.meshVert      = 0;
	this.meshVertCount = 0;
	this.lightmapNum   = 0;
	this.normal        = [0, 0, 0];
	// grid meshes
	this.patchWidth    = 0;
	this.patchHeight   = 0;
	// normal faces
	this.plane         = new Plane();
};

var mnode_t = function () {
	this.parent   = null;
	this.plane    = null;
	this.children = [null, null];
	this.mins     = [0, 0, 0];
	this.maxs     = [0, 0, 0];
};

var mleaf_t = function () {
	this.parent           = null;
	this.cluster          = 0;
	this.area             = 0;
	this.mins             = [0, 0, 0];
	this.maxs             = [0, 0, 0];
	this.firstLeafSurface = 0;
	this.numLeafSurfaces  = 0;
	this.firstLeafBrush   = 0;
	this.numLeafBrushes   = 0;
};

var bmodel_t = function () {
	this.bounds       = [[0, 0, 0], [0, 0, 0]];            // for culling
	this.firstSurface = 0;
	this.numSurfaces  = 0;
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

/**********************************************************
 * MD3 files
 **********************************************************/
var MD3_IDENT   = (('3'.charCodeAt() << 24) + ('P'.charCodeAt() << 16) + ('D'.charCodeAt() << 8) + 'I'.charCodeAt());
var MD3_VERSION = 15;

// limits
var MD3_MAX_LODS      = 3;
var MD3_MAX_TRIANGLES = 8192;                              // per surface
var MD3_MAX_VERTS     = 4096;                              // per surface
var MD3_MAX_SHADERS   = 256;                               // per surface
var MD3_MAX_FRAMES    = 1024;                              // per model
var MD3_MAX_SURFACES  = 32;                                // per model
var MD3_MAX_TAGS      = 16;                                // per frame

// vertex scales
var MD3_XYZ_SCALE     = (1.0/64);

// The MD3 object is what we actually use in the engine, the structures
// below are representative of the actual file we load from disk.
var MD3 = function () {
	this.name     = null;
	this.flags    = 0;
	this.frames   = null;
	this.tags     = null;
	this.surfaces = null;
	this.skins    = null;
};

var MD3Surface = function () {
	this.ident         = SurfaceType.MD3;
	this.header        = null;
	this.name          = null;
	this.shaders       = null;
	this.st            = null;
	this.triangles     = null;
	this.xyzNormals    = null;
};

var MD3Header = function () {
	this.ident       = 0;                                  // int
	this.version     = 0;                                  // int
	this.name        = null;                               // char[MAX_QPATH], model name
	this.flags       = 0;                                  // int
	this.numFrames   = 0;                                  // int
	this.numTags     = 0;                                  // int
	this.numSurfaces = 0;                                  // int
	this.numSkins    = 0;                                  // int
	this.ofsFrames   = 0;                                  // int, offset for first frame
	this.ofsTags     = 0;                                  // int, numFrames * numTags
	this.ofsSurfaces = 0;                                  // int, first surface, others follow
	this.ofsEnd      = 0;                                  // int, end of file
};

var MD3SurfaceHeader = function () {
	this.ident         = 0;                                // int 
	this.name          = null;                             // char[MAX_QPATH], polyset name
	this.flags         = 0;                                // int
	this.numFrames     = 0;                                // int, all surfaces in a model should have the same
	this.numShaders    = 0;                                // int, all surfaces in a model should have the same
	this.numVerts      = 0;                                // int
	this.numTriangles  = 0;                                // int
	this.ofsTriangles  = 0;                                // int
	this.ofsShaders    = 0;                                // int, offset from start of md3Surface_t
	this.ofsSt         = 0;                                // int, texture coords are common for all frames
	this.ofsXyzNormals = 0;                                // int, numVerts * numFrames
	this.ofsEnd        = 0;                                // int, next surface follows
};

var MD3Shader = function () {
	this.name        = null;                               // char[MAX_QPATH]
	this.shader      = 0;                                  // for in-game use
};

var MD3Triangle = function () {
	this.indexes = [0, 0, 0];                              // int[3]
};

var MD3St = function () {
	this.st = [0, 0];                                      // float[2]
};

var MD3XyzNormal = function () {
	this.xyz    = [0, 0, 0];                               // short[3]
	//this.normal = 0;                                     // short, zenith and azimuth angles of normal vector.
	this.normal = [0, 0, 0];
};

var MD3Frame = function () {
	this.bounds      = [                                   // float[6]
		[0, 0, 0],
		[0, 0, 0]
	];
	this.localOrigin = [0, 0, 0];                          // float[3]
	this.radius      = 0;                                  // float
	this.name        = null;                               // char[16]
};

var MD3Tag = function () {
	this.name   = null;                                    // char[MAX_QPATH]
	this.origin = [0, 0, 0];
	this.axis   = [
		[0, 0, 0],
		[0, 0, 0],
		[0, 0, 0]
	];
};

/**********************************************************
 * Textures/Shaders
 **********************************************************/
var ShaderSort = {
	BAD:            0,
	PORTAL:         1,                                     // mirrors, portals, viewscreens
	ENVIRONMENT:    2,                                     // sky box
	OPAQUE:         3,                                     // opaque
	DECAL:          4,                                     // scorch marks, etc.
	SEE_THROUGH:    5,                                     // ladders, grates, grills that may have small blended
	                                                       // edges in addition to alpha test
	BANNER:         6,
	FOG:            7,
	UNDERWATER:     8,                                     // for items that should be drawn in front of the water plane
	BLEND0:         9,                                     // regular transparency and filters
	BLEND1:         10,                                    // generally only used for additive type effects
	BLEND2:         11,
	BLEND3:         12,
	BLEND6:         13,
	STENCIL_SHADOW: 14,
	ALMOST_NEAREST: 15,                                    // gun smoke puffs
	NEAREST:        16                                     // blood blobs
};

var LightmapType = {
	UV:         -4,                                        // shader is for 2D rendering
	VERTEX:     -3,                                        // pre-lit triangle models
	WHITEIMAGE: -2,
	NONE:       -1
};

var Texture = function () {
	this.name   = null;
	this.texnum = null;
};

// This is the final, compiled shader struct we use in the game.
var Shader = function () {
	this.name        = null;
	this.sort        = ShaderSort.OPAQUE;
	this.cull        = gl.FRONT;
	this.stages      = [];
	this.sortedIndex = 0;                                  // assigned internally
};

var ShaderStage = function () {
	this.texture      = null;
	this.animFreq     = 0;
	this.animTextures = null;
	this.blendSrc     = gl.ONE;
	this.blendDest    = gl.ZERO;
	this.depthWrite   = true;
	this.depthFunc    = gl.LEQUAL;
	this.program      = null;
};

// This is a parsed version of a shader right out of a .shader file from baseq3/shaders
var Q3Shader = function () {
	this.name          = null;
	this.sort          = 0;                                // DON'T specify a defualt sort, ParseShader handles it.
	this.cull          = 'front';
	this.sky           = false;
	this.blend         = false;
	this.opaque        = false;
	this.lightmapIndex = 0;
	this.stages        = [];
	this.vertexDeforms = [];
};

var Q3ShaderStage = function () {
	this.map           = null;
	this.animFreq      = 0;
	this.animMaps      = [];
	this.clamp         = false;
	this.tcGen         = 'base';
	this.rgbGen        = 'identity';
	this.rgbWaveform   = null;
	this.alphaGen      = '1.0';
	this.alphaFunc     = null;
	this.alphaWaveform = null;
	this.blendSrc      = 'GL_ONE';
	this.blendDest     = 'GL_ZERO';
	this.hasBlendFunc  = false;
	this.tcMods        = [];
	this.depthFunc     = 'lequal';
	this.depthWrite    = true;
	this.isLightmap    = false;
};

/**********************************************************
 * Models
 **********************************************************/
var ModelType = {
	BAD:   0,
	BRUSH: 1,
	MD3:   2
};

var Model = function () {
	this.name     = null;
	this.type     = ModelType.BAD;
	this.index    = 0;                                    // model = tr.models[model->index]
	this.dataSize = 0;                                    // just for listing purposes
	this.bmodel   = null;
	this.md3      = new Array(MD3_MAX_LODS);
	this.numLods  = 0;
};