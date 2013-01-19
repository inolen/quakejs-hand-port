var MAX_QPATH = 64;

var MAX_DRAWGEOM  = 4096;
var MAX_DLIGHTS = 32;
var SHADER_MAX_VERTEXES = 4096;
var SHADER_MAX_INDEXES  = 6 * SHADER_MAX_VERTEXES;

/**
 * The draw geometry sort data is packed into a single 32 bit value so it can be
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

// 14 bits, can't be increased without changing bit packing
// for drawsurfs.
var SHADERNUM_BITS       = 14;
var MAX_SHADERS          = (1 << SHADERNUM_BITS);

var CULL = {
	IN:   0,                                               // completely unclipped
	CLIP: 1,                                               // clipped by one or more planes
	OUT:  2                                                // completely outside the clipping planes
};

var RenderLocals = function () {
	this.viewCluster        = -1;
	this.refdef             = new RefDef();
	this.viewParms          = new ViewParms();
	this.or                 = new QShared.Orientation();           // for current entity
	this.currentEntityNum   = 0;

	this.world              = null;
	this.counts             = new RenderCounts();

	this.skyShader          = null;
	this.skydomeGeo         = new SkydomeGeometry();

	this.visCount           = 0;                           // incremented every time a new vis cluster is entered
	this.frameCount         = 0;                           // incremented every frame
	this.sceneCount         = 0;                           // incremented every scene
	this.viewCount          = 0;                           // incremented every view (twice a scene if portaled)

	this.numRefEnts         = 0;                           // track refents added before RenderScene
	this.numDlights         = 0;                           // track dlights added before RenderScene

	this.identityLight      = 0;                           // 1.0 / ( 1 << overbrightBits )
	this.overbrightBits     = 0;                           // r_overbrightBits

	// Shaders.
	this.scriptBodies       = [];                          // source shader scripts
	this.shaders            = null;
	this.sortedShaders      = [];
	this.defaultShader      = null;

	this.textures           = null;
	this.skins              = null;
	this.models             = null;

	// OpenGL extension handles.
	this.ext_s3tc           = null;
};

var RenderCounts = function () {
	this.shaders         = 0;
	this.nodes           = 0;
	this.leafs           = 0;
	this.surfaces        = 0;
	this.vertexes        = 0;
	this.indexes         = 0;
	this.culledModelOut  = 0;
	this.culledModelIn   = 0;
	this.culledModelClip = 0;
};

var RefDef = function () {
	this.x             = 0;
	this.y             = 0;
	this.width         = 0;
	this.height        = 0;
	this.fovX          = 0;
	this.fovY          = 0;
	this.vieworg       = vec3.create();
	this.viewaxis      = [
		vec3.create(),
		vec3.create(),
		vec3.create()
	];
	this.time          = 0;                                // time in milliseconds for shader effects
	this.timeSecs      = 0;
	this.rdflags       = 0;                                // RDF_NOWORLDMODEL, etc

	// Internal to the renderer.
	this.numDrawGeom   = 0;
	this.numRefEnts    = 0;
	this.numDlights    = 0;
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
	to.timeSecs = this.timeSecs;
	to.rdflags = this.rdflags;
	to.numDrawGeom = this.numDrawGeom;
	to.numRefEnts = this.numRefEnts;
	to.numDlights = this.numDlights;

	return to;
};

var ViewParms = function () {
	this.or               = new QShared.Orientation();
	// this.world            = new QShared.Orientation();
	this.isPortal         = false;                         // true if this view is through a portal
	this.isMirror         = false;                         // the portal is a mirror, invert the face culling
	this.pvsOrigin        = vec3.create();                     // may be different than or.origin for portals
	this.portalPlane      = new QMath.Plane();             // clip anything behind this if mirroring
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
		vec3.create(),
		vec3.create()
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
	to.isPortal = this.isPortal;
	to.isMirror = this.isMirror;
	vec3.set(this.pvsOrigin, to.pvsOrigin);
	this.portalPlane.clone(to.portalPlane);
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

var RDF = {
	NOWORLDMODEL: 1,                                       // don't render world
	HYPERSPACE:   2                                        // teleportation effect
};

var MAX_VERTS_ON_POLY = 10;

var RefEntity = function () {
	this.reType             = 0;
	this.renderfx           = 0;

	// Most recent data.
	this.origin             = vec3.create();
	this.lightingOrigin     = vec3.create();                   // so multi-part models can be lit identically (RF_LIGHTING_ORIGIN)
	this.axis               = [                            // rotation vectors
		vec3.create(),
		vec3.create(),
		vec3.create()
	];
	this.nonNormalizedAxes  = false;
	this.frame              = 0;

	// Previous data for frame interpolation.
	this.oldOrigin          = vec3.create();
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
	this.polyVerts          = [];

	// Internal use only.
	this.lightingCalculated = false;
	this.lightDir           = vec3.create();                   // normalized direction towards light
	this.ambientLight       = vec3.create();                   // color normalized to 0-255
	this.directedLight      = vec3.create();                   // color normalized to 0-255
};

RefEntity.prototype.clone = function (refent) {
	if (typeof(refent) === 'undefined') {
		refent = new RefEntity();
	}

	refent.reType = this.reType;
	refent.renderfx = this.renderfx;
	refent.hModel = this.hModel;
	vec3.set(this.origin, refent.origin);
	vec3.set(this.lightingOrigin, refent.lightingOrigin);
	vec3.set(this.axis[0], refent.axis[0]);
	vec3.set(this.axis[1], refent.axis[1]);
	vec3.set(this.axis[2], refent.axis[2]);
	refent.nonNormalizedAxes = this.nonNormalizedAxes;
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
	refent.polyVerts = new Array(this.polyVerts.length);
	for (var i = 0; i < this.polyVerts.length; i++) {
		refent.polyVerts[i] = this.polyVerts[i].clone();
	}

	return refent;
};

var PolyVert = function () {
	this.xyz      = vec3.create();
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
	vec4.set(this.modulate, to.modulate);

	return to;
};

var Dlight = function () {
	this.origin = vec3.create();
	this.color  = vec3.create();                               // range from 0.0 to 1.0, should be color normalized
	this.radius = 0;
};

/**********************************************************
 *
 * Backend state
 *
 **********************************************************/
var BackendState = function () {
	this.refdef          = new RefDef();
	this.viewParms       = new ViewParms();
	this.or              = new QShared.Orientation();

	// Dynamic info for the current frame.
	this.currentEntity   = null;
	this.currentShader   = null;
	this.currentGeo      = null;
	this.shaderTime      = 0;
	this.dlightBits      = 0;

	this.entityGeo       = null;
	this.debugGeo        = null;                           // only xyz / index, but holds 0xFFFF elements
	this.collisionGeo    = null;

	this.dlightPositions = new Float32Array(MAX_DLIGHTS * 3);
	this.dlightInfo      = new Float32Array(MAX_DLIGHTS * 4);

	this.drawGeom        = new Array(MAX_DRAWGEOM);
	this.refents         = new Array(MAX_GENTITIES);
	this.dlights         = new Array(MAX_DLIGHTS);

	for (var i = 0; i < MAX_DRAWGEOM; i++) {
		this.drawGeom[i] = new DrawGeometry();
	}

	for (var i = 0; i < MAX_GENTITIES; i++) {
		this.refents[i] = new RefEntity();
	}

	for (var i = 0; i < MAX_DLIGHTS; i++) {
		this.dlights[i] = new Dlight();
	}
};

var DrawGeometry = function () {
	this.sort = 0;
	this.geo  = null;
};

var GeometryBuffer = function () {
	this.type     = 0;

	this.array    = null;
	this.index    = 0;
	this.offset   = 0;

	this.size     = 0;
	this.dataType = 0;
	this.buffer   = null;
	this.update   = false;
};

GeometryBuffer.prototype.clone = function (to) {
	if (typeof(to) === 'undefined') {
		to = new GeometryBuffer();
	}

	to.type = this.type;

	to.array = this.array;
	to.index = this.index;
	to.offset = this.offset;

	to.size = this.size;
	to.dataType = this.dataType;
	to.buffer = this.buffer;
	to.update = this.update;

	return to;
}

var Geometry = function () {
	this.attributes = {};
	this.dynamic    = false;
};

var WorldGeometry = function () {
	Geometry.call(this);

	this.initialized = false;
	this.shader      = null;
	this.numVerts    = 0;
	this.numIndexes  = 0;
	this.faces       = [];
	this.dlightBits  = 0;
};
WorldGeometry.prototype = new Geometry();
WorldGeometry.prototype.constructor = WorldGeometry;

var SkydomeGeometry = function () {
	Geometry.call(this);

	this.initialized = false;
};
SkydomeGeometry.prototype = new Geometry();
SkydomeGeometry.prototype.constructor = SkydomeGeometry;

var Md3Geometry = function () {
	Geometry.call(this);

	this.initialized = false;
	this.surface  = null;
};
Md3Geometry.prototype = new Geometry();
Md3Geometry.prototype.constructor = SkydomeGeometry;

var EntityGeometry = function () {
	Geometry.call(this);
};
EntityGeometry.prototype = new Geometry();
EntityGeometry.prototype.constructor = EntityGeometry;

/**********************************************************
 *
 * Renderer specific world data
 *
 **********************************************************/
var RenderWorld = function () {
	this.shaders              = null;
	this.planes               = null;
	this.nodes                = null;
	this.leafSurfaces         = null;
	this.bmodels              = null;
	this.verts                = null;
	this.meshVerts            = null;
	this.fogs                 = null;
	this.surfaces             = null;
	this.lightmaps            = null;
	this.lightGridOrigin      = vec3.create();
	this.lightGridSize        = vec3.createFrom(64, 64, 128);
	this.lightGridInverseSize = vec3.create();
	this.lightGridBounds      = vec3.create();
	this.lightGridData        = null;
	this.numClusters          = 0;
	this.clusterBytes         = 0;
	this.vis                  = null;
};

var WorldNode = function () {
	this.parent           = null;
	this.mins             = vec3.create();
	this.maxs             = vec3.create();

	// Non-leaf nodes.
	this.plane            = null;
	this.children         = null;

	// Leafs.
	this.cluster          = 0;
	this.area             = 0;
	this.firstLeafSurface = 0;
	this.numLeafSurfaces  = 0;
	this.firstLeafBrush   = 0;
	this.numLeafBrushes   = 0;
};

var WorldSurface = function () {
	this.surfaceType   = SF.BAD;
	this.shader        = null;
	this.fogIndex      = 0;
	this.vertex        = 0;
	this.vertCount     = 0;
	this.meshVert      = 0;
	this.meshVertCount = 0;
	this.lightmapNum   = 0;
	this.normal        = vec3.create();

	// Grid meshes.
	this.patchWidth    = 0;
	this.patchHeight   = 0;

	// Normal faces.
	this.plane         = new QMath.Plane();

	// Pre-comiled render geometry.
	this.geo           = null;
};

var SF = {
	BAD:       0,
	FACE:      1,
	GRID:      2,
	TRIANGLES: 3
};

/**********************************************************
 *
 * Models
 *
 **********************************************************/
var MOD = {
	BAD:   0,
	BRUSH: 1,
	MD3:   2
};

var Model = function () {
	this.type      = MOD.BAD;
	this.name      = null;
	this.bmodel    = null;
	this.md3       = null;
};

var MD3_IDENT         = (('3'.charCodeAt() << 24) + ('P'.charCodeAt() << 16) + ('D'.charCodeAt() << 8) + 'I'.charCodeAt());
var MD3_VERSION       = 15;
var MD3_MAX_LODS      = 3;
var MD3_MAX_TRIANGLES = 8192;                              // per surface
var MD3_MAX_VERTS     = 4096;                              // per surface
var MD3_MAX_SHADERS   = 256;                               // per surface
var MD3_MAX_FRAMES    = 1024;                              // per model
var MD3_MAX_SURFACES  = 32;                                // per model
var MD3_MAX_TAGS      = 16;                                // per frame
var MD3_XYZ_SCALE     = (1.0/64);

var Md3 = function () {
	this.name      = null;
	this.flags     = 0;
	this.frames    = null;
	this.tags      = null;
	this.surfaces  = null;
	this.skins     = null;
};

var Md3Surface = function () {
	this.name        = null;
	this.numFrames   = 0;
	this.numVerts    = 0;
	this.shaders     = null;
	this.st          = null;
	this.indexes     = null;                               // triangles grouped in 3s
	this.xyz         = null;
	this.normals     = null;
	this.model       = null;

	// Pre-comiled render geometry.
	this.geo         = null;
};

var Md3Frame = function () {
	this.bounds      = [                                   // float[6]
		vec3.create(),
		vec3.create()
	];
	this.localOrigin = vec3.create();                          // float[3]
	this.radius      = 0;                                  // float
	this.name        = null;                               // char[16]
};

var Md3Tag = function () {
	this.name   = null;                                    // char[MAX_QPATH]
	this.origin = vec3.create();
	this.axis   = [
		vec3.create(),
		vec3.create(),
		vec3.create()
	];
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

/**********************************************************
 *
 * Shaders / textures
 *
 **********************************************************/
var Shader = function () {
	this.name           = null;
	this.sort           = 0;

	this.surfaceFlags   = 0;
	this.contentFlags   = 0;

	this.cull           = 0;
	this.sky            = false;
	this.fog            = false;
	this.hasBlendFunc   = false;
	this.blendSrc       = 0;
	this.blendDest      = 0;
	this.depthWrite     = false;
	this.depthFunc      = 0;
	this.polygonOffset  = false;
	this.entityMergable = false;                           // merge entites (smoke, blood) during tesselation
	this.program        = null;

	this.stages         = [];
	this.sortedIndex    = 0;                               // assigned internally
};

var ShaderStage = function () {
	this.textures = [];
	this.animFreq = 0;
};

var Texture = function () {
	this.name    = null;
	this.texnum  = null;
};

var Skin = function () {
	this.name     = null;
	this.surfaces = [];
};

var SkinSurface = function () {
	this.name   = null;
	this.shader = null;
};