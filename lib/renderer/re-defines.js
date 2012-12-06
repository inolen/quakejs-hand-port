var MAX_DRAWSURFS  = 0xFFFF;

// Surface geometry should not exceed these limits
// TODO How does Q3 stay so low? Their limit is 1000, we can fit under 2000 in most cases, but q3ctf2 is ~4300.
var SHADER_MAX_VERTEXES = 3000;
var SHADER_MAX_INDEXES  = 6 * SHADER_MAX_VERTEXES;

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
var QSORT_SHADERNUM_SHIFT = QSORT_ENTITYNUM_SHIFT + GENTITYNUM_BITS;

// 14 bits
// can't be increased without changing bit packing for drawsurfs
// see QSORT_SHADERNUM_SHIFT
var SHADERNUM_BITS       = 14;
var MAX_SHADERS          = (1 << SHADERNUM_BITS);

var CULL = {
	IN:   0,                                               // completely unclipped
	CLIP: 1,                                               // clipped by one or more planes
	OUT:  2                                                // completely outside the clipping planes
};

var RenderLocals = function () {
	// Frontend.
	this.refdef             = new RefDef();
	this.viewParms          = new ViewParms();
	this.or                 = new sh.Orientation();           // for current entity
	this.currentEntityNum   = 0;

	this.world              = null;
	this.counts             = new RenderCounts();

	this.visCount           = 0;                           // incremented every time a new vis cluster is entered
	this.frameCount         = 0;                           // incremented every frame
	this.sceneCount         = 0;                           // incremented every scene
	this.viewCount          = 0;                           // incremented every view (twice a scene if portaled)

	this.numRefEnts         = 0;                           // track refents added before RenderScene

	this.identityLight      = 0;                           // 1.0 / ( 1 << overbrightBits )
	this.overbrightBits     = 0;                           // r_overbrightBits

	// Shaders.
	this.shaderBodies       = {};
	this.programBodies      = {};
	this.shaders            = [];
	this.sortedShaders      = [];
	this.defaultShader      = null;
	this.debugShader        = null;
	this.programDefault     = null;
	this.programNoLightmap  = null;

	// Textures.
	this.textures           = {};
	this.defaultTexture     = null;
	this.lightmapTexture    = null;
	this.whiteTexture       = null;

	// Skins.
	this.skins              = [];

	// Models.
	this.models             = [];

	// OpenGL extension handles.
	this.ext_s3tc           = null;
};

var RenderCounts = function () {
	this.shaders         = 0;
	this.vertexes        = 0;
	this.indexes         = 0;
	this.culledFaces     = 0;
	this.culledModelOut  = 0;
	this.culledModelIn   = 0;
	this.culledModelClip = 0;
};

var WorldData = function () {
	this.name                 = null;
	this.path                 = null;

	this.compiledFaces        = null;

	this.lightmaps            = null;
	this.shaders              = null;
	this.verts                = null;
	this.meshVerts            = null;
	this.faces                = null;
	this.planes               = null;
	this.leafSurfaces         = null;
	this.nodes                = null;
	this.leafs                = null;
	
	this.numClusters          = 0;
	this.clusterBytes         = 0;
	this.vis                  = null;

	this.bmodels              = null;
	this.lightGridOrigin      = [0, 0, 0];
	this.lightGridSize        = [64, 64, 128];
	this.lightGridInverseSize = [0, 0, 0];
	this.lightGridBounds      = [0, 0, 0];
	this.lightGridData        = null;
};

var RefDef = function () {
	this.x             = 0;
	this.y             = 0;
	this.width         = 0;
	this.height        = 0;
	this.fovX          = 0;
	this.fovY          = 0;
	this.vieworg       = [0, 0, 0];
	this.viewaxis      = [
		[0, 0, 0],
		[0, 0, 0],
		[0, 0, 0]
	];
	// Time in milliseconds for shader effects and other time dependent rendering issues.
	this.time          = 0;

	// Internal to the renderer.
	this.numDrawSurfs  = 0;
	this.numRefEnts    = 0;
};

RefDef.prototype.clone = function (to) {
	if (typeof(to) === 'undefined') {
		to = new RefDef();
	}

	to.x = this.x;
	to.y = this.y;
	to.width = this.width;
	to.height = this.height;
	to.fovX = this.fovX;
	to.fovY = this.fovY;
	vec3.set(this.vieworg, to.vieworg);
	vec3.set(this.viewaxis[0], to.viewaxis[0]);
	vec3.set(this.viewaxis[1], to.viewaxis[1]);
	vec3.set(this.viewaxis[2], to.viewaxis[2]);
	to.time = this.time;
	to.numDrawSurfs = this.numDrawSurfs;
	to.numRefEnts = this.numRefEnts;

	return to;
};

var ViewParms = function () {
	this.or               = new sh.Orientation();
	// this.world            = new sh.Orientation();
	this.pvsOrigin        = [0, 0, 0];                     // may be different than or.origin for portals
	this.x                = 0;
	this.y                = 0;
	this.width            = 0;
	this.height           = 0;
	this.fovX             = 0;
	this.fovY             = 0;
	this.frustum          = [
		new QMath.Plane(),
		new QMath.Plane(),
		new QMath.Plane(),
		new QMath.Plane()
	];
	this.visBounds        = [
		[0, 0, 0],
		[0, 0, 0]
	];
	this.zFar             = 0;
	this.projectionMatrix = mat4.create();
	this.frameCount       = 0;
};

ViewParms.prototype.clone = function (to) {
	if (typeof(to) === 'undefined') {
		to = new ViewParms();
	}

	this.or.clone(to.or);
	// this.world.clone(to.world);
	vec3.set(this.pvsOrigin, to.pvsOrigin);
	to.x = this.x;
	to.y = this.y;
	to.width = this.width;
	to.height = this.height;
	to.fovX = this.fovX;
	to.fovY = this.fovY;
	this.frustum[0].clone(to.frustum[0]);
	this.frustum[1].clone(to.frustum[1]);
	this.frustum[2].clone(to.frustum[2]);
	this.frustum[3].clone(to.frustum[3]);
	vec3.set(this.visBounds[0], to.visBounds[0]);
	vec3.set(this.visBounds[1], to.visBounds[1]);
	to.zFar = this.zFar;
	mat4.set(this.projectionMatrix, to.projectionMatrix);
	to.frameCount = this.frameCount;

	return to;
};

/**
 * Ref entities
 */
var MAX_VERTS_ON_POLY = 10;

var RT = {
	MODEL:               0,
	POLY:                1,
	SPRITE:              2,
	BEAM:                3,
	RAIL_CORE:           4,
	RAIL_RINGS:          5,
	LIGHTNING:           6,
	PORTALSURFACE:       7,                                // doesn't draw anything, just info for portals
	MAX_REF_ENTITY_TYPE: 8
};

var RF = {
	MINLIGHT:        0x0001,                               // allways have some light (viewmodel, some items)
	THIRD_PERSON:    0x0002,                               // don't draw through eyes, only mirrors (player bodies, chat sprites)
	FIRST_PERSON:    0x0004,                               // only draw through eyes (view weapon, damage blood blob)
	DEPTHHACK:       0x0008,                               // for view weapon Z crunching
	NOSHADOW:        0x0040,                               // don't add stencil shadows
	LIGHTING_ORIGIN: 0x0080,                               // use refEntity->lightingOrigin instead of refEntity->origin
	                                                       // for lighting.  This allows entities to sink into the floor
	                                                       // with their origin going solid, and allows all parts of a
	                                                       // player to get the same lighting
	SHADOW_PLANE:    0x0100,                               // use refEntity->shadowPlane
	WRAP_FRAMES:     0x0200                                // mod the model frames by the maxframes to allow continuous
};

var RefEntity = function () {
	this.index              = 0;                           // internal use only
	this.reType             = 0;
	this.renderfx           = 0;

	// Most recent data.
	this.origin             = [0, 0, 0];
	this.lightingOrigin     = [0, 0, 0];                   // so multi-part models can be lit identically (RF_LIGHTING_ORIGIN)
	this.axis               = [                            // rotation vectors
		[0, 0, 0],
		[0, 0, 0],
		[0, 0, 0]
	];
	this.nonNormalizedAxes  = false;
	this.frame              = 0;

	// Previous data for frame interpolation.
	this.oldOrigin          = [0, 0, 0];
	this.oldFrame           = 0;
	this.backlerp           = 0;

	// Texturing.
	this.skinNum            = 0;                          // inline skin index
	this.customSkin         = 0;                          // NULL for default skin
	this.customShader       = 0;                          // use one image for the entire thing

	// Misc.
	this.shaderRGBA         = [0, 0, 0, 0];                // colors used by rgbgen entity shaders
	this.shaderTexCoord     = [0, 0];                      // texture coordinates used by tcMod entity modifiers
	this.shaderTime         = 0;                           // subtracted from refdef time to control effect start times

	// Extra sprite information.
	this.radius             = 0;
	this.rotation           = 0;

	// Poly info.
	this.numPolyVerts       = 0;
	this.polyVerts          = new Array(MAX_VERTS_ON_POLY);

	// Internal use only.
	this.lightingCalculated = false;
	this.lightDir           = [0, 0, 0];                   // normalized direction towards light
	this.ambientLight       = [0, 0, 0];                   // color normalized to 0-255
	this.directedLight      = [0, 0, 0];                   // color normalized to 0-255

	for (var i = 0; i < MAX_VERTS_ON_POLY; i++) {
		this.polyVerts[i] = new PolyVert();
	}
};

RefEntity.prototype.clone = function (refent) {
	if (typeof(refent) === 'undefined') {
		refent = new RefEntity();
	}

	refent.index = this.index;
	refent.reType = this.reType;
	refent.renderfx = this.renderfx;
	refent.hModel = this.hModel;
	vec3.set(this.origin, refent.origin);
	vec3.set(this.lightingOrigin, refent.lightingOrigin);
	vec3.set(this.axis[0], refent.axis[0]);
	vec3.set(this.axis[1], refent.axis[1]);
	vec3.set(this.axis[2], refent.axis[2]);
	refent,nonNormalizedAxes = this.nonNormalizedAxes;
	refent.frame = this.frame;
	vec3.set(this.oldOrigin, refent.oldOrigin);
	refent.oldFrame = this.oldFrame;
	refent.backlerp = this.backlerp;
	refent.skinNum = this.skinNum;
	refent.customSkin = this.customSkin;
	refent.customShader = this.customShader;
	refent.shaderRGBA[0] = this.shaderRGBA[0];
	refent.shaderRGBA[1] = this.shaderRGBA[1];
	refent.shaderRGBA[2] = this.shaderRGBA[2];
	refent.shaderRGBA[3] = this.shaderRGBA[3];
	refent.shaderTexCoord[0] = this.shaderTexCoord[0];
	refent.shaderTexCoord[1] = this.shaderTexCoord[1];
	refent.shaderTime = this.shaderTime;
	refent.radius = this.radius;
	refent.rotation = this.rotation;
	refent.lightingCalculated = this.lightingCalculated;
	vec3.set(this.lightDir, refent.lightDir);
	vec3.set(this.ambientLight, refent.ambientLight);
	vec3.set(this.directedLight, refent.directedLight);
	refent.numPolyVerts = this.numPolyVerts;
	for (var i = 0; i < MAX_VERTS_ON_POLY; i++) {
		this.polyVerts[i].clone(refent.polyVerts[i]);
	}

	return refent;
};

var PolyVert = function () {
	this.xyz      = [0, 0, 0];
	this.st       = [0, 0];
	this.modulate = [0, 0, 0, 0];
};
PolyVert.prototype.clone = function (to) {
	if (typeof(to) === 'undefined') {
		to = new PolyVert();
	}

	vec3.set(this.xyz, to.xyz);
	to.st[0] = this.st[0];
	to.st[1] = this.st[1];
	to.modulate[0] = this.modulate[0];
	to.modulate[1] = this.modulate[1];
	to.modulate[2] = this.modulate[2];
	to.modulate[3] = this.modulate[3];

	return to;
};

/**
 * BackendState
 */
var BackendState = function () {
	this.refdef            = new RefDef();
	this.viewParms         = new ViewParms();
	this.or                = new sh.Orientation();

	this.currentEntity     = null;
	this.currentModel      = null;

	// Dynamic buffers.
	this.scratchBuffers    = null;
	this.debugBuffers      = null;                         // only xyz / index, but holds 0xFFFF elements

	// Static buffer optimizations.
	this.skyBuffers         = null;
	this.collisionBuffers   = null;
	this.modelBuffers       = null;

	// Shader commands for the current frame
	this.forceRender       = false;
	this.tess              = new ShaderCommand();
	this.tessFns           = {};

	// Actual data used by the backend for rendering.
	this.drawSurfs      = new Array(MAX_DRAWSURFS);
	this.refEnts        = new Array(MAX_GENTITIES);

	for (var i = 0; i < MAX_DRAWSURFS; i++) {
		this.drawSurfs[i] = new DrawSurface();
	}

	for (var i = 0; i < MAX_GENTITIES; i++) {
		this.refEnts[i] = new RefEntity();
	}
};

var ShaderCommand = function () {
	this.shader       = null;
	this.shaderTime   = 0;
	this.indexOffset  = 0;
	this.elementCount = 0;

	this.index       = null;
	this.xyz         = null;
	this.normal      = null;
	this.texCoord    = null;
	this.lightCoord  = null;
	this.color       = null;
};

var RenderBuffer = function () {
	this.ab            = null;                             // underlying arraybuffer data
	this.data          = null;                             // view into the arraybuffer
	this.glBuffer      = null;
	this.glBufferType  = 0;
	this.glElementType = 0;
	this.elementSize   = 0;                                // length of elements (e.g. xyz buffer is 3 floats)
	this.offset        = 0;                                // current offset into view
	this.locked        = false;                            // locked arrays won't be reset by BeginSurface()
	this.modified      = false;                            // tells the backend to rebind data to glBuffer
};
Object.defineProperty(RenderBuffer.prototype, 'elementCount', {
	get: function() {
		return this.offset / this.elementSize;
	}
});

/**
 * Render surfaces
 */
var SF = {
	BAD:           0,
	SKIP:          1,                                      // ignore
	FACE:          2,
	GRID:          3,
	TRIANGLES:     4,
	POLY:          5,
	MD3:           6,
	ENTITY:        7,                                      // beams, rails, lightning, etc that can be determined by entity
	COMPILED_FACE: 8,
	COMPILED_MD3:  9
};

var DrawSurface = function () {
	this.sort    = 0;                                      // bit combination for fast compares
	this.surface = -1;                                     // any of surface*_t
};

var CompiledSurface = function () {
	this.surfaceType  = SF.COMPILED_FACE;
	this.cmd          = new ShaderCommand();               // precompiled buffers
	this.viewCount    = 0;                                 // if == re.viewCount, already added
	this.shader       = null;
	// temporary resources used during compilation
	this.numVerts     = 0;
	this.numIndexes   = 0;
	this.faces        = [];
};

var CompiledMd3Surface = function () {
	this.surfaceType  = SF.COMPILED_MD3;
	this.cmd          = new ShaderCommand();               // precompiled buffers
	this.shaders      = null;
	this.numVerts     = 0;
	this.normals      = null;
	this.colorOffset  = 0;
};

var EntitySurface = function () {
	this.surfaceType = SF.ENTITY;
};

/**
 * Textures/Shaders
 */
var SS = {
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

var LIGHTMAP = {
	TWOD:       -4,                                        // shader is for 2D rendering
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
	this.name           = null;
	this.sort           = SS.OPAQUE;
	this.cull           = gl.FRONT;
	this.entityMergable = false;                           // merge entites (smoke, blood) during tesselation
	this.mode           = gl.TRIANGLES;
	this.stages         = [];
	this.index          = 0;                               // assigned internally
	this.sortedIndex    = 0;                               // assigned internally
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
	this.name           = null;
	this.sort           = 0;                               // DON'T specify a defualt sort, ParseShader handles it.
	this.cull           = 'front';
	this.entityMergable = false;
	this.sky            = false;
	this.blend          = false;
	this.opaque         = false;
	this.lightmapIndex  = 0;
	this.stages         = [];
	this.vertexDeforms  = [];
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

/*********************************************************
 * Skins
 *
 * Allow models to be retextured without modifying the model file.
 *********************************************************/
var Skin = function () {
	this.name     = null;
	this.surfaces = [];
};

var SkinSurface = function () {
	this.name   = null;
	this.shader = null;
};

/**********************************************************
 * Models
 **********************************************************/
var MOD = {
	BAD:   0,
	BRUSH: 1,
	MD3:   2
};

var Model = function () {
	this.type      = MOD.BAD;
	this.name      = null;
	this.index     = 0;                                    // model = tr.models[model->index]
	this.bmodel    = null;
	this.md3       = [];
	this.numLods   = 0;
	this.loaded    = false;
	this.callbacks = [];
};

/**
 * Renderer specific BSP structs
 */
var msurface_t = function () {
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
	this.plane         = new QMath.Plane();

	// links this surface to its compiled parent, for vis checks
	this.compiled      = null;
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

/**
 * Md3 files
 */
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

// The Md3 object is what we actually use in the engine, the structures
// below are representative of the actual file we load from disk.
var Md3 = function () {
	this.name      = null;
	this.flags     = 0;
	this.frames    = null;
	this.tags      = null;
	this.surfaces  = null;
	this.skins     = null;
};

var Md3Header = function () {
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

var Md3SurfaceHeader = function () {
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

var Md3Surface = function () {
	this.surfaceType   = SF.MD3;
	this.header        = null;
	this.name          = null;
	this.shaders       = null;
	this.st            = null;
	this.triangles     = null;
	this.xyzNormals    = null;
	this.model         = null;
};

var Md3Shader = function () {
	this.name        = null;                               // char[MAX_QPATH]
	this.shader      = 0;                                  // for in-game use
};

var Md3Triangle = function () {
	this.indexes = [0, 0, 0];                              // int[3]
};

var Md3St = function () {
	this.st = [0, 0];                                      // float[2]
};

var Md3XyzNormal = function () {
	this.xyz    = [0, 0, 0];                               // short[3]
	this.normal = [0, 0, 0];                               // 
};

var Md3Frame = function () {
	this.bounds      = [                                   // float[6]
		[0, 0, 0],
		[0, 0, 0]
	];
	this.localOrigin = [0, 0, 0];                          // float[3]
	this.radius      = 0;                                  // float
	this.name        = null;                               // char[16]
};

var Md3Tag = function () {
	this.name   = null;                                    // char[MAX_QPATH]
	this.origin = [0, 0, 0];
	this.axis   = [
		[0, 0, 0],
		[0, 0, 0],
		[0, 0, 0]
	];
};