define('renderer/re',
['underscore', 'glmatrix', 'ByteBuffer'],
function (_, glmatrix, ByteBuffer) {
	/**********************************************************
 * Stateless functions and data structures
 * included by each module.
 **********************************************************/

var Q3W_BASE_FOLDER = 'baseq3';

/**********************************************************
 * Communicated across the network
 **********************************************************/
var SNAPFLAG_RATE_DELAYED   = 1;
var SNAPFLAG_NOT_ACTIVE     = 2;                           // snapshot used during connection and for zombies
var SNAPFLAG_SERVERCOUNT    = 4;                           // toggled every map_restart so transitions can be detected

var MAX_CLIENTS            = 64;                           // absolute limit
var MAX_LOCATIONS          = 64;
var MAX_GENTITIES          = 1024;

var ENTITYNUM_NONE         = MAX_GENTITIES-1;
var ENTITYNUM_WORLD        = MAX_GENTITIES-2;
var ENTITYNUM_MAX_NORMAL   = MAX_GENTITIES-2;

var NetAdrType = {
	NAD:      0,
	LOOPBACK: 1,
	IP:       2
};

var NetSrc = {
	CLIENT : 0,
	SERVER: 1
};

var NetAdr = function (type, ip, port) {
	this.type = type;
	this.ip   = ip;
	this.port = port;
};

/**********************************************************
 * A user command is what the client sends to the server
 * each frame to let it know its status.
 **********************************************************/
var UserCmd = function () {
	this.serverTime  = 0;
	this.angles      = [0, 0, 0];
	this.forwardmove = 0;
	this.rightmove   = 0;
	this.upmove      = 0;
};

/**********************************************************
 * Player state
 **********************************************************/
var PS_PMOVEFRAMECOUNTBITS = 6;

var PlayerState = function () {
	this.clientNum        = 0;                             // ranges from 0 to MAX_CLIENTS-1
	this.commandTime      = 0;                             // cmd->serverTime of last executed command
	this.pm_type          = 0;
	this.pm_flags         = 0;                             // ducked, jump_held, etc
	this.origin           = [0, 0, 0];
	this.velocity         = [0, 0, 0];
	this.viewangles       = [0, 0, 0];
	this.speed            = 0;
	this.gravity          = 0;
	this.groundEntityNum  = ENTITYNUM_NONE;                // ENTITYNUM_NONE = in air
	this.jumppad_ent      = 0;                             // jumppad entity hit this frame
	this.jumppad_frame    = 0;
	this.pmove_framecount = 0;
};

// deep copy
PlayerState.prototype.clone = function (ps) {
	if (typeof(ps) === 'undefined') {
		ps = new PlayerState();
	}

	ps.clientNum            = this.clientNum;
	ps.commandTime          = this.commandTime;
	ps.pm_type              = this.pm_type;
	ps.pm_flags             = this.pm_flags;
	vec3.set(this.origin,     ps.origin);
	vec3.set(this.velocity,   ps.velocity);
	vec3.set(this.viewangles, ps.viewangles);
	ps.speed                = this.speed;
	ps.gravity              = this.gravity;
	ps.groundEntityNum      = this.groundEntityNum;
	ps.jumppad_ent          = this.jumppad_ent;
	ps.jumppad_frame        = this.jumppad_frame;
	ps.pmove_framecount     = this.pmove_framecount;

	return ps;
};

var TrajectoryType = {
	STATIONARY:  0,
	INTERPOLATE: 1,                              // non-parametric, but interpolate between snapshots
	LINEAR:      2,
	LINEAR_STOP: 3,
	SINE:        4,                              // value = base + sin( time / duration ) * delta
	GRAVITY:     5
};

var Trajectory = function () {
	this.trType     = 0;
	this.trTime     = 0;
	this.trDuration = 0;
	this.trBase     = [0, 0, 0];
	this.trDelta    = [0, 0, 0];
};

Trajectory.prototype.clone = function (tr) {
	if (typeof(tr) === 'undefined') {
		tr = new Trajectory();
	}

	tr.trType = this.trType;
	tr.trTime = this.trTime;
	tr.trDuration = this.trDuration;
	vec3.set(this.trBase, tr.trBase);
	vec3.set(this.trDelta, tr.trDelta);

	return tr;
}

/**********************************************************
 * EntityState is the information conveyed from the server
 * in an update message about entities that the client will
 * need to render in some way. Different eTypes may use the
 * information in different ways. The messages are delta
 * compressed, so it doesn't really matter if the structure
 * size is fairly large
 **********************************************************/
var EntityState = function () {
	this.number          = 0;                              // entity index
	this.eType           = 0;                              // entityType_t
	this.eFlags          = 0;
	this.pos             = new Trajectory();               // for calculating position
	this.apos            = new Trajectory();               // for calculating angles
	this.time            = 0;
	this.time2           = 0;
	this.origin          = [0, 0, 0];
	this.origin2         = [0, 0, 0];
	this.angles          = [0, 0, 0];
	this.angles2         = [0, 0, 0];
	this.groundEntityNum = ENTITYNUM_NONE;                 // ENTITYNUM_NONE = in air
	this.modelindex      = 0;
	this.modelindex2     = 0;
	this.clientNum       = 0;                              // 0 to (MAX_CLIENTS - 1), for players and corpses
	this.frame           = 0;
	this.solid           = 0;                              // for client side prediction, trap_linkentity sets this properly
	this.event           = 0;                              // impulse events -- muzzle flashes, footsteps, etc
	this.eventParm       = 0;
};

// deep copy
EntityState.prototype.clone = function (es) {
	if (typeof(es) === 'undefined') {
		es = new EntityState();
	}

	es.number            = this.number;
	es.eType             = this.eType;
	es.eFlags            = this.eFlags;
	this.pos.clone(es.pos);
	this.apos.clone(es.apos);
	es.time              = this.time;
	es.time2             = this.time2;
	vec3.set(this.origin,  es.origin);
	vec3.set(this.origin2, es.origin2);
	vec3.set(this.angles,  es.angles);
	vec3.set(this.angles2, es.angles2);
	es.groundEntityNum   = this.groundEntityNum;
	es.modelindex        = this.modelindex;
	es.modelindex2       = this.modelindex2;
	es.clientNum         = this.clientNum;
	es.frame             = this.frame;
	es.solid             = this.solid;
	es.event             = this.event;
	es.eventParm         = this.eventParm;

	return es;
};

/**********************************************************
 * Angles
 **********************************************************/
var PITCH = 0; // up / down
var YAW   = 1; // left / right
var ROLL  = 2; // fall over

function LerpAngle(from, to, frac) {
	if (to - from > 180) {
		to -= 360;
	}
	if (to - from < -180) {
		to += 360;
	}

	return from + frac * (to - from);
}

function AnglesToVectors(angles, forward, right, up) {
	var angle;
	var sr, sp, sy, cr, cp, cy;

	angle = angles[YAW] * (Math.PI*2 / 360);
	sy = Math.sin(angle);
	cy = Math.cos(angle);
	angle = angles[PITCH] * (Math.PI*2 / 360);
	sp = Math.sin(angle);
	cp = Math.cos(angle);
	angle = angles[ROLL] * (Math.PI*2 / 360);
	sr = Math.sin(angle);
	cr = Math.cos(angle);

	forward[0] = cp*cy;
	forward[1] = cp*sy;
	forward[2] = -sp;

	right[0] = (-1*sr*sp*cy+-1*cr*-sy);
	right[1] = (-1*sr*sp*sy+-1*cr*cy);
	right[2] = -1*sr*cp;

	up[0] = (cr*sp*cy+-sr*-sy);
	up[1] = (cr*sp*sy+-sr*cy);
	up[2] = cr*cp;
}

function AnglesToAxis(angles, axis) {
	var right = [0, 0, 0];

	// angle vectors returns "right" instead of "y axis"
	AnglesToVectors(angles, axis[0], right, axis[2]);
	vec3.subtract([0, 0, 0], right, axis[1]);
}

/**********************************************************
 * Planes
 **********************************************************/
var PLANE_X         = 0;
var PLANE_Y         = 1;
var PLANE_Z         = 2;
var PLANE_NON_AXIAL = 3;

var Plane = function () {
	this.normal   = vec3.create();
	this.dist     = 0;
	this.type     = 0;
	this.signbits = 0;
};

function PlaneTypeForNormal(x) {
	return x[0] == 1.0 ? PLANE_X : (x[1] == 1.0 ? PLANE_Y : (x[2] == 1.0 ? PLANE_Z : PLANE_NON_AXIAL))
}

function GetPlaneSignbits(p) {
	var bits = 0;

	for (var i = 0; i < 3; i++) {
		if (p.normal[i] < 0) {
			bits |= 1 << i;
		}
	}

	return bits;
}

// Returns 1, 2, or 1 + 2.
function BoxOnPlaneSide(mins, maxs, p) {
	// fast axial cases
	if (p.type < PLANE_NON_AXIAL) {
		if (p.dist <= mins[p.type]) {
			return 1;
		} else if (p.dist >= maxs[p.type]) {
			return 2;
		}
		return 3;
	}

	// general case
	var dist = [0, 0];
	
	if (p.signbits < 8) {                       // >= 8: default case is original code (dist[0]=dist[1]=0)
		for (var i = 0; i < 3; i++) {
			var b = (p.signbits >> i) & 1;
			dist[b] += p.normal[i]*maxs[i];
			dist[b^1] += p.normal[i]*mins[i];
		}
	}

	var sides = 0;
	if (dist[0] >= p.dist) {
		sides = 1;
	}
	if (dist[1] < p.dist) {
		sides |= 2;
	}

	return sides;
}


/**********************************************************
 * Radix sort 32 bit ints into 8 bit buckets.
 * http://stackoverflow.com/questions/8082425/fastest-way-to-sort-32bit-signed-integer-arrays-in-javascript
 **********************************************************/
var _radixSort_0 = [
	0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,
	0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,
	0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,
	0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,
	0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,
	0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,
	0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,
	0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,
	0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,
	0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,
	0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,
	0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,
	0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,
	0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,
	0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,
	0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0
];

function RadixSort(arr, prop, len) {
	var cpy = new Array(len);
	var c4 = [].concat(_radixSort_0); 
	var c3 = [].concat(_radixSort_0); 
	var c2 = [].concat(_radixSort_0);
	var c1 = [].concat(_radixSort_0); 
	var o4 = 0; var k4;
	var o3 = 0; var k3;
	var o2 = 0; var k2;
	var o1 = 0; var k1;
	var x;
	for (x = 0; x < len; x++) {
		k4 = arr[x][prop] & 0xFF;
		k3 = (arr[x][prop] >> 8) & 0xFF;
		k2 = (arr[x][prop] >> 16) & 0xFF;
		k1 = (arr[x][prop] >> 24) & 0xFF ^ 0x80;
		c4[k4]++;
		c3[k3]++;
		c2[k2]++;
		c1[k1]++;
	}
	for (x = 0; x < 256; x++) {
		k4 = o4 + c4[x];
		k3 = o3 + c3[x];
		k2 = o2 + c2[x];
		k1 = o1 + c1[x];
		c4[x] = o4;
		c3[x] = o3;
		c2[x] = o2;
		c1[x] = o1;
		o4 = k4;
		o3 = k3;
		o2 = k2;
		o1 = k1;
	}
	for (x = 0; x < len; x++) {
		k4 = arr[x][prop] & 0xFF;
		cpy[c4[k4]] = arr[x];
		c4[k4]++;
	}
	for (x = 0; x < len; x++) {
		k3 = (cpy[x][prop] >> 8) & 0xFF;
		arr[c3[k3]] = cpy[x];
		c3[k3]++;
	}
	for (x = 0; x < len; x++) {
		k2 = (arr[x][prop] >> 16) & 0xFF;
		cpy[c2[k2]] = arr[x];
		c2[k2]++;
	}
	for (x = 0; x < len; x++) {
		k1 = (cpy[x][prop] >> 24) & 0xFF ^ 0x80;
		arr[c1[k1]] = cpy[x];
		c1[k1]++;
	}

	return arr;
}

/**********************************************************
 * Surface flags
 **********************************************************/
var SurfaceFlags = {
	NODAMAGE:    0x1,                            // never give falling damage
	SLICK:       0x2,                            // effects game physics
	SKY:         0x4,                            // lighting from environment map
	LADDER:      0x8,
	NOIMPACT:    0x10,                           // don't make missile explosions
	NOMARKS:     0x20,                           // don't leave missile marks
	FLESH:       0x40,                           // make flesh sounds and effects
	NODRAW:      0x80,                           // don't generate a drawsurface at all
	HINT:        0x100,                          // make a primary bsp splitter
	SKIP:        0x200,                          // completely ignore, allowing non-closed brushes
	NOLIGHTMAP:  0x400,                          // surface doesn't need a lightmap
	POINTLIGHT:  0x800,                          // generate lighting info at vertexes
	METALSTEPS:  0x1000,                         // clanking footsteps
	NOSTEPS:     0x2000,                         // no footstep sounds
	NONSOLID:    0x4000,                         // don't collide against curves with this set
	LIGHTFILTER: 0x8000,                         // act as a light filter during q3map -light
	ALPHASHADOW: 0x10000,                        // do per-pixel light shadow casting in q3map
	NODLIGHT:    0x20000,                        // don't dlight even if solid (solid lava, skies)
	DUST:        0x40000                         // leave a dust trail when walking on this surface
};

/**********************************************************
 * Q3 BSP Defines
 **********************************************************/
var Lumps = {
	ENTITIES:     0,
	SHADERS:      1,
	PLANES:       2,
	NODES:        3,
	LEAFS:        4,
	LEAFSURFACES: 5,
	LEAFBRUSHES:  6,
	MODELS:       7,
	BRUSHES:      8,
	BRUSHSIDES:   9,
	DRAWVERTS:    10,
	DRAWINDEXES:  11,
	FOGS:         12,
	SURFACES:     13,
	LIGHTMAPS:    14,
	LIGHTGRID:    15,
	VISIBILITY:   16,
	NUM_LUMPS:    17
};

var MAX_QPATH = 64;

var lumps_t = function () {
	this.fileofs  = 0;                           // int32
	this.filelen = 0;                           // int32
};

var dheader_t = function () {
	this.ident    = null;                        // byte * 4 (string)
	this.version  = 0;                           // int32
	this.lumps    = new Array(Lumps.NUM_LUMPS);  // lumps_t * Lumps.NUM_LUMPS

	for (var i = 0; i < Lumps.NUM_LUMPS; i++) {
		this.lumps[i] = new lumps_t();
	}
};

var dmodel_t = function () {
	this.mins         = [0, 0, 0];               // float32 * 3
	this.maxs         = [0, 0, 0];               // float32 * 3
	this.firstSurface = 0;                       // int32
	this.numSurfaces  = 0;                       // int32
	this.firstBrush   = 0;                       // int32
	this.numBrushes   = 0;                       // int32
};
dmodel_t.size = 40;

var dshader_t = function () {
	this.shaderName = null;                      // byte * MAX_QPATH (string)
	this.flags      = 0;                         // int32
	this.contents   = 0;                         // int32
};
dshader_t.size = 72;

var dplane_t = function () {
	this.normal = [0, 0, 0];                     // float32 * 3
	this.dist   = 0;                             // float32
};
dplane_t.size = 16;

var dnode_t = function () {
	this.planeNum    = 0;                        // int32
	this.childrenNum = [0, 0];                   // int32 * 2
	this.mins        = [0, 0, 0];                // int32 * 3
	this.maxs        = [0, 0, 0];                // int32 * 3
};
dnode_t.size = 36;

var dleaf_t = function () {
	this.cluster          = 0;                   // int32
	this.area             = 0;                   // int32
	this.mins             = [0, 0, 0];           // int32 * 3
	this.maxs             = [0, 0, 0];           // int32 * 3
	this.firstLeafSurface = 0;                   // int32
	this.numLeafSurfaces  = 0;                   // int32
	this.firstLeafBrush   = 0;                   // int32
	this.numLeafBrushes   = 0;                   // int32
};
dleaf_t.size = 48;

var dbrushside_t = function () {
	this.planeNum = 0;                           // int32
	this.shader   = 0;                           // int32
};
dbrushside_t.size = 8;

var dbrush_t = function () {
	this.side     = 0;                           // int32
	this.numsides = 0;                           // int32
	this.shader   = 0;                           // int32
};
dbrush_t.size = 12;

var dfog_t = function () {
	this.shader      = null;                     // byte * MAX_QPATH (string)
	this.brushNum    = 0;                        // int32
	this.visibleSide = 0;                        // int32
};
dfog_t.size = 72;

var drawVert_t = function () {
	this.pos      = [0, 0, 0];                   // float32 * 3
	this.texCoord = [0, 0];                      // float32 * 2
	this.lmCoord  = [0, 0];                      // float32 * 2
	this.normal   = [0, 0, 0];                   // float32 * 3
	this.color    = [0, 0, 0, 0];                // uint8 * 4
};
drawVert_t.size = 44;

var MapSurfaceType = {
	BAD:           0,
	PLANAR:        1,
	PATCH:         2,
	TRIANGLE_SOUP: 3,
	FLARE:         4
};

var dsurface_t = function () {
	this.shaderNum     = 0;                      // int32
	this.fogNum        = 0;                      // int32
	this.surfaceType   = 0;                      // int32
	this.vertex        = 0;                      // int32
	this.vertCount     = 0;                      // int32
	this.meshVert      = 0;                      // int32
	this.meshVertCount = 0;                      // int32
	this.lightmapNum   = 0;                      // int32
	this.lmStart       = [0, 0];                 // int32 * 2
	this.lmSize        = [0, 0];                 // int32 * 2
	this.lmOrigin      = [0, 0, 0];              // float32 * 3
	this.lmVecs        = [                       // float32 * 9
		[0, 0, 0],
		[0, 0, 0],
		[0, 0, 0]
	];
	this.patchWidth    = 0;                      // int32
	this.patchHeight   = 0;                      // int32
};
dsurface_t.size = 104;

/**********************************************************
 * Misc
 **********************************************************/
function ClampChar(i) {
	if (i < -128) {
		return -128;
	}
	if (i > 127) {
		return 127;
	}
	return i;
}

var RenderContext = function () {
	this.gl     = null;
	this.handle = null;
};
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

var RefEntityType = {
	BBOX:                0,
	MODEL:               1,
	POLY:                2,
	SPRITE:              3,
	BEAM:                4,
	RAIL_CORE:           5,
	RAIL_RINGS:          6,
	LIGHTNING:           7,
	PORTALSURFACE:       8,                      // doesn't draw anything, just info for portals
	MAX_REF_ENTITY_TYPE: 9
};

var RefEntity = function () {
	this.reType = 0;
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

/************************************************
 * Backend structs
 ************************************************/
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

var DrawSurface = function () {
	this.sort    = 0;                            // bit combination for fast compares
	this.surface = -1;                           // any of surface*_t
};

/************************************************
 * Renderer specific BSP structs
 ************************************************/
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

var msurface_t = function () {
	this.surfaceType   = SurfaceType.BAD;
	this.viewCount     = 0;                        // if == re.viewCount, already added
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
	var cl;

var re;
var gl;
var viewportUi;
var r_cull;
var r_subdivisions;
var r_znear;
var r_zproj;

var flipMatrix = mat4.create([
	0, 0, -1, 0,
	-1, 0, 0, 0,
	0, 1, 0, 0,
	0, 0, 0, 1
]);

function Init(clinterface) {
	console.log('--------- RE Init ---------');

	cl = clinterface;
	
	re = new RenderLocals();

	r_cull = cl.AddCvar('r_cull', 1);
	r_subdivisions = cl.AddCvar('r_subdivisions', 4);
	r_znear = cl.AddCvar('r_znear', 4);
	r_zproj = cl.AddCvar('r_zproj', 64);

	var gameContext = cl.GetGameRenderContext();
	var uiContext = cl.GetUIRenderContext();
	gl = gameContext.gl;
	viewportUi = uiContext.handle;

	InitImages();
	InitShaders();
}

function Shutdown() {
	console.log('--------- RE Shutdown ---------');
	DeleteTextures();
}

function RenderScene(fd) {
	if (!re.world) {
		//throw new Error('RenderScene: NULL worldmodel');
		return;
	}

	re.refdef.x = fd.x;
	re.refdef.y = fd.y
	re.refdef.width = fd.width;
	re.refdef.height = fd.height;
	re.refdef.fovX = fd.fovX;
	re.refdef.fovY = fd.fovY;
	re.refdef.origin = fd.vieworg;
	re.refdef.viewaxis = fd.viewaxis;
	re.refdef.time = fd.time;

	re.refdef.numDrawSurfs = 0;
	re.pc.surfs = 0;
	re.pc.leafs = 0;
	re.pc.verts  = 0;

	var parms = new ViewParms();
	parms.x = fd.x;
	parms.y = fd.y
	parms.width = fd.width;
	parms.height = fd.height;
	parms.fovX = fd.fovX;
	parms.fovY = fd.fovY;
	vec3.set(fd.vieworg, parms.or.origin);
	vec3.set(fd.viewaxis[0], parms.or.axis[0]);
	vec3.set(fd.viewaxis[1], parms.or.axis[1]);
	vec3.set(fd.viewaxis[2], parms.or.axis[2]);
	vec3.set(fd.vieworg, parms.pvsOrigin);

	RenderView(parms);

	re.refdef.numRefEntities = 0;
}

function AddRefEntityToScene(refent) {
	if (refent.reType < 0 || refent.reType >= RefEntityType.MAX_REF_ENTITY_TYPE) {
		throw new Error('AddRefEntityToScene: bad reType ' + ent.reType);
	}

	re.refdef.refEntities[re.refdef.numRefEntities].reType = refent.reType;
	vec3.set(refent.origin, re.refdef.refEntities[re.refdef.numRefEntities].origin);
	vec3.set(refent.mins, re.refdef.refEntities[re.refdef.numRefEntities].mins);
	vec3.set(refent.maxs, re.refdef.refEntities[re.refdef.numRefEntities].maxs);

	re.refdef.numRefEntities++;
}

function RotateModelMatrixForViewer() {
	var or = re.viewParms.or;

	// Create model view matrix.
	var modelMatrix = mat4.create();
	modelMatrix[0] = or.axis[0][0];
	modelMatrix[4] = or.axis[0][1];
	modelMatrix[8] = or.axis[0][2];
	modelMatrix[12] = -or.origin[0] * modelMatrix[0] + -or.origin[1] * modelMatrix[4] + -or.origin[2] * modelMatrix[8];

	modelMatrix[1] = or.axis[1][0];
	modelMatrix[5] = or.axis[1][1];
	modelMatrix[9] = or.axis[1][2];
	modelMatrix[13] = -or.origin[0] * modelMatrix[1] + -or.origin[1] * modelMatrix[5] + -or.origin[2] * modelMatrix[9];

	modelMatrix[2] = or.axis[2][0];
	modelMatrix[6] = or.axis[2][1];
	modelMatrix[10] = or.axis[2][2];
	modelMatrix[14] = -or.origin[0] * modelMatrix[2] + -or.origin[1] * modelMatrix[6] + -or.origin[2] * modelMatrix[10];

	modelMatrix[3] = 0;
	modelMatrix[7] = 0;
	modelMatrix[11] = 0;
	modelMatrix[15] = 1;

	// convert from our coordinate system (looking down X)
	// to OpenGL's coordinate system (looking down -Z)
	mat4.multiply(flipMatrix, modelMatrix, or.modelMatrix);
}

function RotateModelMatrixForEntity(refent, or) {
	vec3.set(refent.origin, or.origin);
	/*vec3.set(refent.axis[0], or.axis[0]);
	vec3.set(refent.axis[1], or.axis[1]);
	vec3.set(refent.axis[2], or.axis[2]);*/
	vec3.set(re.viewParms.or.axis[0], or.axis[0]);
	vec3.set(re.viewParms.or.axis[1], or.axis[1]);
	vec3.set(re.viewParms.or.axis[2], or.axis[2]);

	var modelMatrix = mat4.create();
	modelMatrix[0] = or.axis[0][0];
	modelMatrix[4] = or.axis[1][0];
	modelMatrix[8] = or.axis[2][0];
	modelMatrix[12] = or.origin[0];

	modelMatrix[1] = or.axis[0][1];
	modelMatrix[5] = or.axis[1][1];
	modelMatrix[9] = or.axis[2][1];
	modelMatrix[13] = or.origin[1];

	modelMatrix[2] = or.axis[0][2];
	modelMatrix[6] = or.axis[1][2];
	modelMatrix[10] = or.axis[2][2];
	modelMatrix[14] = or.origin[2];

	modelMatrix[3] = 0;
	modelMatrix[7] = 0;
	modelMatrix[11] = 0;
	modelMatrix[15] = 1;

	mat4.multiply(re.viewParms.or.modelMatrix, modelMatrix, or.modelMatrix);

	/*// calculate the viewer origin in the model's space
	// needed for fog, specular, and environment mapping
	VectorSubtract( viewParms->or.origin, or->origin, delta );

	// compensate for scale in the axes if necessary
	if ( ent->e.nonNormalizedAxes ) {
		axisLength = VectorLength( ent->e.axis[0] );
		if ( !axisLength ) {
			axisLength = 0;
		} else {
			axisLength = 1.0f / axisLength;
		}
	} else {
		axisLength = 1.0f;
	}

	or->viewOrigin[0] = DotProduct( delta, or->axis[0] ) * axisLength;
	or->viewOrigin[1] = DotProduct( delta, or->axis[1] ) * axisLength;
	or->viewOrigin[2] = DotProduct( delta, or->axis[2] ) * axisLength;*/
}

function SetupProjectionMatrix(zProj) {
	var parms = re.viewParms;

	var ymax = zProj * Math.tan(parms.fovY * Math.PI / 360);
	var ymin = -ymax;

	var xmax = zProj * Math.tan(parms.fovX * Math.PI / 360);
	var xmin = -xmax;

	var width = xmax - xmin;
	var height = ymax - ymin;

	parms.projectionMatrix[0] = 2 * zProj / width;
	parms.projectionMatrix[4] = 0;
	parms.projectionMatrix[8] = (xmax + xmin) / width;
	parms.projectionMatrix[12] = 0;

	parms.projectionMatrix[1] = 0;
	parms.projectionMatrix[5] = 2 * zProj / height;
	parms.projectionMatrix[9] = (ymax + ymin) / height; // normally 0
	parms.projectionMatrix[13] = 0;

	parms.projectionMatrix[3] = 0;
	parms.projectionMatrix[7] = 0;
	parms.projectionMatrix[11] = -1;
	parms.projectionMatrix[15] = 0;

	// Now that we have all the data for the projection matrix we can also setup the view frustum.
	SetupFrustum(parms, xmin, xmax, ymax, zProj);
}

/**
 * SetupFrustum
 * Set up the culling frustum planes for the current view using the results we got from computing the first two rows of 
 * the projection matrix.
 */
function SetupFrustum(parms, xmin, xmax, ymax, zProj) {
	var ofsorigin = vec3.create(parms.or.origin);

	var length = Math.sqrt(xmax * xmax + zProj * zProj);
	var oppleg = xmax / length;
	var adjleg = zProj / length;

	vec3.scale(parms.or.axis[0], oppleg, parms.frustum[0].normal);
	vec3.add(parms.frustum[0].normal, vec3.scale(parms.or.axis[1], adjleg, [0,0,0]));

	vec3.scale(parms.or.axis[0], oppleg, parms.frustum[1].normal);
	vec3.add(parms.frustum[1].normal, vec3.scale(parms.or.axis[1], -adjleg, [0,0,0]));

	length = Math.sqrt(ymax * ymax + zProj * zProj);
	oppleg = ymax / length;
	adjleg = zProj / length;

	vec3.scale(parms.or.axis[0], oppleg, parms.frustum[2].normal);
	vec3.add(parms.frustum[2].normal, vec3.scale(parms.or.axis[2], adjleg, [0,0,0]));

	vec3.scale(parms.or.axis[0], oppleg, parms.frustum[3].normal);
	vec3.add(parms.frustum[3].normal, vec3.scale(parms.or.axis[2], -adjleg, [0,0,0]));

	for (var i = 0; i < 4; i++) {
		parms.frustum[i].type = PLANE_NON_AXIAL;
		parms.frustum[i].dist = vec3.dot(ofsorigin, parms.frustum[i].normal);
		parms.frustum[i].signbits = GetPlaneSignbits(parms.frustum[i]);
	}
}

function SetFarClip() {
	var parms = re.viewParms;

	// if not rendering the world (icons, menus, etc)
	// set a 2k far clip plane
	/*if (tr.refdef.rdflags & RDF_NOWORLDMODEL) {
		tr.viewParms.zFar = 2048;
		return;
	}*/

	// set far clipping planes dynamically
	var farthestCornerDistance = 0;
	for (var i = 0; i < 8; i++) {
		var v = [0, 0, 0];

		if ( i & 1 ) {
			v[0] = parms.visBounds[0][0];
		} else {
			v[0] = parms.visBounds[1][0];
		}

		if (i & 2) {
			v[1] = parms.visBounds[0][1];
		} else {
			v[1] = parms.visBounds[1][1];
		}

		if (i & 4) {
			v[2] = parms.visBounds[0][2];
		} else {
			v[2] = parms.visBounds[1][2];
		}

		var vecTo = vec3.subtract(v, re.viewParms.or.origin, [0, 0, 0]);
		var distance = vecTo[0] * vecTo[0] + vecTo[1] * vecTo[1] + vecTo[2] * vecTo[2];

		if (distance > farthestCornerDistance) {
			farthestCornerDistance = distance;
		}
	}

	re.viewParms.zFar = Math.sqrt(farthestCornerDistance);
}

/**
 * SetupProjectionZ
 * Sets the z-component transformation part in the projection matrix.
 */
function SetupProjectionMatrixZ() {
	var parms = re.viewParms;

	var zNear = r_znear();
	var zFar = parms.zFar;
	var depth = zFar - zNear;

	parms.projectionMatrix[2] = 0;
	parms.projectionMatrix[6] = 0;
	parms.projectionMatrix[10] = -(zFar + zNear) / depth;
	parms.projectionMatrix[14] = -2 * zFar * zNear / depth;
}

function RenderView(parms) {
	re.viewCount++;
	re.viewParms = parms;
	re.viewParms.frameSceneNum = re.frameSceneNum;
	re.viewParms.frameCount = re.frameCount;
	// TODO not needed until we support portals
	//var firstDrawSurf = re.refdef.numDrawSurfs;
	re.viewCount++;

	// SETUP tr.or
	//vec3.set(re.viewParms.or.origin, re.or.viewOrigin);

	RotateModelMatrixForViewer();
	SetupProjectionMatrix(r_zproj());

	GenerateDrawSurfs();
	SortDrawSurfaces();
	// TODO we need to call something like R_AddDrawSurfCmd
	RenderDrawSurfaces();
	RenderRefEntities();
}

function GenerateDrawSurfs() {
	AddWorldSurfaces();

	// AddWorldSurfaces will setup the min/max visibility bounds.
	SetFarClip();
	SetupProjectionMatrixZ();
}

function AddDrawSurf(face, shader/*, fogIndex, dlightMap*/) {
	var refdef = re.refdef;

	// Instead of checking for overflow, we just mask the index so it wraps around.
	var index = refdef.numDrawSurfs & DRAWSURF_MASK;
	// The sort data is packed into a single 32 bit value so it can be
	// compared quickly during the qsorting process.
	refdef.drawSurfs[index].sort = (shader.sortedIndex << QSORT_SHADERNUM_SHIFT);
	//	| tr.shiftedEntityNum | ( fogIndex << QSORT_FOGNUM_SHIFT ) | (int)dlightMap;
	refdef.drawSurfs[index].surface = face;
	refdef.numDrawSurfs++;

	re.pc.surfs++;
}

function SortDrawSurfaces() {
	RadixSort(re.refdef.drawSurfs, 'sort', re.refdef.numDrawSurfs);
}

function RenderDrawSurfaces() {
	var world = re.world;
	var parms = re.viewParms;
	var refdef = re.refdef;
	var drawSurfs = refdef.drawSurfs;
	var shaders = world.shaders;

	// Setup
	gl.viewport(0, 0, parms.width, parms.height);
	gl.clearColor(0.0, 0.0, 0.0, 1.0);
	gl.clearDepth(1.0);

	gl.enable(gl.DEPTH_TEST);
	gl.enable(gl.BLEND);
	gl.enable(gl.CULL_FACE);

	// Clear back buffer but not color buffer (we expect the entire scene to be overwritten)
	gl.depthMask(true);
	gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

	// Seconds passed since map was initialized.
	var time = refdef.time / 1000.0;

	// If we have a skybox, render it first.
	if (skyShader) {
		gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, skyboxIndexBuffer);
		gl.bindBuffer(gl.ARRAY_BUFFER, skyboxBuffer);

		SetShader(skyShader);
		for(var j = 0; j < skyShader.stages.length; j++) {
			var stage = skyShader.stages[j];

			SetShaderStage(skyShader, stage, time);
			BindSkyAttribs(stage.program, parms.or.modelMatrix, parms.projectionMatrix);

			// Draw all geometry that uses this textures
			gl.drawElements(gl.TRIANGLES, skyboxIndexCount, gl.UNSIGNED_SHORT, 0);
		}
	}

	// Map Geometry buffers
	gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, indexBuffer);
	gl.bindBuffer(gl.ARRAY_BUFFER, vertexBuffer);

	for (var i = 0; i < refdef.numDrawSurfs;) {
		var face = drawSurfs[i].surface;
		var shader = face.shader;
		var glshader = shader.glshader;

		// Find the next unique shader.
		for (var next = i+1; next < refdef.numDrawSurfs; next++) {
			var face2 = drawSurfs[next].surface;

			if (face2.shader.sortedIndex !== face.shader.sortedIndex) {
				break;
			}
		}

		// Bind the surface shader
		SetShader(glshader);
		
		for (var j = 0; j < glshader.stages.length; j++) {
			var stage = glshader.stages[j];

			SetShaderStage(glshader, stage, time);
			BindShaderAttribs(stage.program, parms.or.modelMatrix, parms.projectionMatrix);

			// Render all surfaces with this same shader.
			for (var k = i; k < next; k++) {
				var face2 = drawSurfs[k].surface;
				gl.drawElements(gl.TRIANGLES, face2.meshVertCount, gl.UNSIGNED_SHORT, face2.indexOffset);
				re.pc.verts += face2.meshVertCount;
			}
		}

		// Move on to the next shader.
		i += next - i;
	}

	/*if (!window.foobar || cl.GetMilliseconds() - window.foobar > 1000) {
		console.log(re.pc.surfs + ' surfs, ' + re.pc.leafs + ' leafs, ', + re.pc.verts + ' verts');
		window.foobar = sys.GetMilliseconds();
	}*/
}

var debugRefEntVerts = [
	// Front face
	-15.0, -15.0,  15.0,
	15.0, -15.0,  15.0,
	15.0,  15.0,  15.0,
	-15.0,  15.0,  15.0,
   
	// Back face
	-15.0, -15.0, -15.0,
	-15.0,  15.0, -15.0,
	15.0,  15.0, -15.0,
	15.0, -15.0, -15.0,
   
	// Top face
	-15.0,  15.0, -15.0,
	-15.0,  15.0,  15.0,
	15.0,  15.0,  15.0,
	15.0,  15.0, -15.0,
   
	// Bottom face
	-15.0, -15.0, -15.0,
	15.0, -15.0, -15.0,
	15.0, -15.0,  15.0,
	-15.0, -15.0,  15.0,
   
	// Right face
	15.0, -15.0, -15.0,
	15.0,  15.0, -15.0,
	15.0,  15.0,  15.0,
	15.0, -15.0,  15.0,
   
	// Left face
	-15.0, -15.0, -15.0,
	-15.0, -15.0,  15.0,
	-15.0,  15.0,  15.0,
	-15.0,  15.0, -15.0
];

var debugRefEntIndexes = [
	0,  1,  2,      0,  2,  3,    // front
	4,  5,  6,      4,  6,  7,    // back
	8,  9,  10,     8,  10, 11,   // top
	12, 13, 14,     12, 14, 15,   // bottom
	16, 17, 18,     16, 18, 19,   // right
	20, 21, 22,     20, 22, 23    // left
]

var debugRefEntVertBuffer;
var debugRefEntIndexBuffer;
var v = '\
	#ifdef GL_ES \n\
	precision highp float; \n\
	#endif \n\
	attribute vec3 position; \n\
\n\
	uniform mat4 modelViewMat; \n\
	uniform mat4 projectionMat; \n\
\n\
	void main(void) { \n\
		vec4 worldPosition = modelViewMat * vec4(position, 1.0); \n\
		gl_Position = projectionMat * worldPosition; \n\
	} \n\
';

var f = '\
	#ifdef GL_ES \n\
	precision highp float; \n\
	#endif \n\
\n\
	void main(void) { \n\
		gl_FragColor = vec4 (0.0, 1.0, 0.0, 1.0);\n\
	} \n\
';
var vs, fs, program;

function RenderRefEntities() {
	if (!debugRefEntVertBuffer) {
		debugRefEntVertBuffer = gl.createBuffer();
		gl.bindBuffer(gl.ARRAY_BUFFER, debugRefEntVertBuffer);
		gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(debugRefEntVerts), gl.STATIC_DRAW);

		debugRefEntIndexBuffer = gl.createBuffer();
		gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, debugRefEntIndexBuffer);
		gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, new Uint16Array(debugRefEntIndexes), gl.STATIC_DRAW);

		if (!program) {
			vs = gl.createShader(gl.VERTEX_SHADER);
			gl.shaderSource(vs, v);
			gl.compileShader(vs);
			
			fs = gl.createShader(gl.FRAGMENT_SHADER);
			gl.shaderSource(fs, f);
			gl.compileShader(fs);

			program = gl.createProgram();
			gl.attachShader(program, vs);
			gl.attachShader(program, fs);
			gl.linkProgram(program);
		}
	}

	gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, debugRefEntIndexBuffer);
	gl.bindBuffer(gl.ARRAY_BUFFER, debugRefEntVertBuffer);

	gl.useProgram(program);

	// Set uniforms
	var uniModelViewMat = gl.getUniformLocation(program, 'modelViewMat');
	var uniProjectionMat = gl.getUniformLocation(program, 'projectionMat');
	//gl.uniformMatrix4fv(uniModelViewMat, false, re.viewParms.or.modelMatrix);
	gl.uniformMatrix4fv(uniProjectionMat, false, re.viewParms.projectionMatrix);

	// Setup vertex attributes
	var attrPosition = gl.getAttribLocation(program, 'position');
	gl.enableVertexAttribArray(attrPosition);
	gl.vertexAttribPointer(attrPosition, 3, gl.FLOAT, false, 12, 0);

	for (var i = 0; i < re.refdef.numRefEntities; i++) {
		var refent = re.refdef.refEntities[i];
		var or = new Orientation();

		RotateModelMatrixForEntity(refent, or);

		gl.uniformMatrix4fv(uniModelViewMat, false, or.modelMatrix);

		gl.drawElements(gl.TRIANGLES, 36, gl.UNSIGNED_SHORT, 0);
	}
}
	function LoadMap(mapName, callback) {
	re.world = new WorldData();

	cl.ReadFile('../' + Q3W_BASE_FOLDER + '/maps/' + mapName + '.bsp', 'binary', function (data) {
		var bb = new ByteBuffer(data, ByteBuffer.LITTLE_ENDIAN);

		// Parse the header.
		var header = new dheader_t();
		header.ident = bb.readUTFChars(4);
		header.version = bb.readInt();
		for (var i = 0; i < Lumps.NUM_LUMPS; i++) {
			header.lumps[i].fileofs = bb.readInt();
			header.lumps[i].filelen = bb.readInt();
		}

		if (header.ident !== 'IBSP' && header.version !== 46) {
			return;
		}

		// Parse the remaining lumps.
		LoadShaders(data, header.lumps[Lumps.SHADERS]);
		LoadLightmaps(data, header.lumps[Lumps.LIGHTMAPS]);
		LoadSurfaces(data,
			header.lumps[Lumps.SURFACES],
			header.lumps[Lumps.DRAWVERTS],
			header.lumps[Lumps.DRAWINDEXES]);
		LoadPlanes(data, header.lumps[Lumps.PLANES]);
		LoadNodesAndLeafs(data,
			header.lumps[Lumps.NODES],
			header.lumps[Lumps.LEAFS],
			header.lumps[Lumps.LEAFSURFACES]);
		LoadVisibility(data, header.lumps[Lumps.VISIBILITY]);

		BuildSkyboxBuffers();
		BuildWorldBuffers();

		if (callback) {
			callback();
		}
	});
}

function BrightnessAdjust(color, factor) {
	var scale = 1.0, temp = 0.0;

	color[0] *= factor;
	color[1] *= factor;
	color[2] *= factor;

	if(color[0] > 255 && (temp = 255/color[0]) < scale) { scale = temp; }
	if(color[1] > 255 && (temp = 255/color[1]) < scale) { scale = temp; }
	if(color[2] > 255 && (temp = 255/color[2]) < scale) { scale = temp; }

	color[0] *= scale;
	color[1] *= scale;
	color[2] *= scale;

	return color;
}

function ColorToVec(color) {
	var r, g, b;

	r = color[0] / 255;
	g = color[1] / 255;
	b = color[2] / 255;

	// normalize by color instead of saturating to white
	if (( r | g | b ) > 1) {
		var max = r > g ? r : g;
		max = max > b ? max : b;
		r /= max;
		g /= max;
		b /= max;
	}

	return [r, g, b, color[3] / 255];
}

function ShaderForShaderNum(shaderNum, lightmapNum) {
	var shaders = re.world.shaders;
	if (shaderNum < 0 || shaderNum >= shaders.length) {
		throw new Error('ShaderForShaderNum: bad num ' + shaderNum);
	}
	var dsh = shaders[shaderNum];
	var shader = FindShader(dsh.shaderName, lightmapNum);

	return shader;
}

function LoadShaders(buffer, shaderLump) {
	var bb = new ByteBuffer(buffer, ByteBuffer.LITTLE_ENDIAN);
	bb.index = shaderLump.fileofs;

	var shaders = re.world.shaders = new Array(shaderLump.filelen / dshader_t.size);

	for (var i = 0; i < shaders.length; i++) {
		var shader = shaders[i] = new dshader_t();

		shader.shaderName = bb.readUTFChars(MAX_QPATH);
		shader.flags = bb.readInt();
		shader.contents = bb.readInt();
	}
}

function LoadLightmaps(buffer, lightmapLump) {
	var bb = new ByteBuffer(buffer, ByteBuffer.LITTLE_ENDIAN);
	bb.index = lightmapLump.fileofs;

	var LIGHTMAP_WIDTH  = 128;
	var LIGHTMAP_HEIGHT = 128;
	var lightmapSize = LIGHTMAP_WIDTH * LIGHTMAP_HEIGHT;
	var count = lightmapLump.filelen / (lightmapSize*3);

	var gridSize = 2;
	while(gridSize * gridSize < count) gridSize *= 2;
	var textureSize = gridSize * LIGHTMAP_WIDTH;

	var xOffset = 0;
	var yOffset = 0;

	re.world.lightmaps = [];

	for(var i = 0; i < count; ++i) {
		var elements = new Array(lightmapSize*4);

		for(var j = 0; j < lightmapSize*4; j+=4) {
			var rgb = [
				bb.readUnsignedByte(),
				bb.readUnsignedByte(),
				bb.readUnsignedByte()
			];

			BrightnessAdjust(rgb, 4.0);

			elements[j] = rgb[0];
			elements[j+1] = rgb[1];
			elements[j+2] = rgb[2];
			elements[j+3] = 255;
		}

		re.world.lightmaps.push({
			x: xOffset,
			y: yOffset,
			width: LIGHTMAP_WIDTH,
			height: LIGHTMAP_HEIGHT,
			buffer: new Uint8Array(elements),
			texCoords: {
				x: xOffset / textureSize,
				y: yOffset /textureSize,
				xScale: LIGHTMAP_WIDTH / textureSize,
				yScale: LIGHTMAP_HEIGHT / textureSize
			}
		});

		xOffset += LIGHTMAP_WIDTH;

		if (xOffset >= textureSize) {
			yOffset += LIGHTMAP_HEIGHT;
			xOffset = 0;
		}
	}

	CreateImage('*lightmap', re.world.lightmaps, textureSize, textureSize);
}

function LoadSurfaces(buffer, faceLump, vertLump, meshVertLump) {
	var bb = new ByteBuffer(buffer, ByteBuffer.LITTLE_ENDIAN);

	// Load verts.
	bb.index = vertLump.fileofs;

	var verts = re.world.verts = new Array(vertLump.filelen / drawVert_t.size);

	for (var i = 0; i < verts.length; i++) {
		var vert = verts[i] = new drawVert_t();

		vert.pos = [bb.readFloat(), bb.readFloat(), bb.readFloat()];
		vert.texCoord = [bb.readFloat(), bb.readFloat()];
		vert.lmCoord = [bb.readFloat(), bb.readFloat()];
		vert.normal = [bb.readFloat(), bb.readFloat(), bb.readFloat()];
		vert.color = [
			bb.readUnsignedByte(), bb.readUnsignedByte(),
			bb.readUnsignedByte(), bb.readUnsignedByte()
		];

		vert.color = ColorToVec(BrightnessAdjust(vert.color, 4.0));
	}

	// Load vert indexes.
	bb.index = meshVertLump.fileofs;

	var meshVerts = re.world.meshVerts = new Array(meshVertLump.filelen / 4);

	for (var i = 0; i < meshVerts.length; i++) {
		meshVerts[i] = bb.readInt();
	}

	// Load surfaces.
	bb.index = faceLump.fileofs;

	var faces = re.world.faces = new Array(faceLump.filelen / dsurface_t.size);

	for (var i = 0; i < faces.length; i++) {
		var face = faces[i] = new msurface_t();

		// Read the source data into temp variabesl.
		var dface = new dsurface_t();

		dface.shaderNum = bb.readInt();
		dface.fogNum = bb.readInt();
		dface.surfaceType  = bb.readInt();
		dface.vertex = bb.readInt();
		dface.vertCount = bb.readInt();
		dface.meshVert = bb.readInt();
		dface.meshVertCount = bb.readInt();
		dface.lightmapNum = bb.readInt();
		dface.lmStart = [bb.readInt(), bb.readInt()];
		dface.lmSize = [bb.readInt(), bb.readInt()];
		dface.lmOrigin = [bb.readFloat(), bb.readFloat(), bb.readFloat()];
		dface.lmVecs = [
			[bb.readFloat(), bb.readFloat(), bb.readFloat()],
			[bb.readFloat(), bb.readFloat(), bb.readFloat()],
			[bb.readFloat(), bb.readFloat(), bb.readFloat()]
		];
		dface.patchWidth = bb.readInt();
		dface.patchHeight = bb.readInt();

		// Setup our in-memory representation.
		face.shader = ShaderForShaderNum(dface.shaderNum, dface.lightmapNum);
		face.fogIndex = dface.fogNum + 1;
		face.vertex = dface.vertex;
		face.vertCount = dface.vertCount;
		face.meshVert = dface.meshVert;
		face.meshVertCount = dface.meshVertCount;
		face.lightmapNum = dface.lightmapNum;
		face.patchWidth = dface.patchWidth;
		face.patchHeight = dface.patchHeight;

		if (dface.surfaceType === MapSurfaceType.PATCH) {
			ParseMesh(dface, face, r_subdivisions());
		} else if (dface.surfaceType === MapSurfaceType.PLANAR) {
			ParseFace(dface, face);
		}
	}

	// Transform lightmap coords to match position in combined texture.
	var lightmaps = re.world.lightmaps;
	var processed = new Array(verts.length);

	for (var i = 0; i < faces.length; i++) {
		var face = faces[i];
		var lightmap = lightmaps[face.lightmapNum];

		if (!lightmap) {
			lightmap = lightmaps[0];
		}

		for (var j = 0; j < face.vertCount; j++) {
			var idx = face.vertex + j;

			if (!processed[idx]) {
				var vert = verts[idx];
				vert.lmCoord[0] = (vert.lmCoord[0] * lightmap.texCoords.xScale) + lightmap.texCoords.x;
				vert.lmCoord[1] = (vert.lmCoord[1] * lightmap.texCoords.yScale) + lightmap.texCoords.y;
				processed[idx] = true;
			}
		}

		for (var j = 0; j < face.meshVertCount; j++) {
			var idx = face.vertex + meshVerts[face.meshVert + j];

			if (!processed[idx]) {
				var vert = verts[idx];
				vert.lmCoord[0] = (vert.lmCoord[0] * lightmap.texCoords.xScale) + lightmap.texCoords.x;
				vert.lmCoord[1] = (vert.lmCoord[1] * lightmap.texCoords.yScale) + lightmap.texCoords.y;
				processed[idx] = true;
			}
		}
	}
}

function ParseMesh(dface, face, level) {
	var verts = re.world.verts;
	var meshVerts = re.world.meshVerts;
	var points = verts.slice(face.vertex, face.vertex + face.vertCount);
	var grid = SubdividePatchToGrid(points, face.patchWidth, face.patchHeight, level);

	face.surfaceType = SurfaceType.GRID;

	// Start at the end of the current vert array.
	face.vertex = verts.length;
	face.vertCount = grid.verts.length;

	face.meshVert = meshVerts.length;
	face.meshVertCount = (grid.width-1) * (grid.height-1) * 6;

	// Append the grid's verts to the world.
	verts.push.apply(verts, grid.verts);

	// Triangulate the indexes and append to the world.
	for (var j = 0; j < grid.height-1; j++) {
		for (var i = 0; i < grid.width-1; i++) {
			var v1 = j*grid.width + i+1;
			var v2 = v1 - 1;
			var v3 = v2 + grid.width;
			var v4 = v3 + 1;
			
			meshVerts.push(v2);
			meshVerts.push(v3);
			meshVerts.push(v1);
				
			meshVerts.push(v1);
			meshVerts.push(v3);
			meshVerts.push(v4);
		}
	}
}

function ParseFace(dface, face) {
	var verts = re.world.verts;

	face.surfaceType = SurfaceType.FACE;

	// Take the plane information from the lightmap vector
	face.plane.normal = vec3.create(dface.lmVecs[2]);
	face.plane.dist = vec3.dot(verts[face.vertex].pos, face.plane.normal);
	face.plane.signbits = GetPlaneSignbits(face.plane);
	face.plane.type = PlaneTypeForNormal(face.plane.normal);
}

function LoadPlanes(buffer, planeLump) {
	var bb = new ByteBuffer(buffer, ByteBuffer.LITTLE_ENDIAN);
	bb.index = planeLump.fileofs;

	var planes = re.world.planes = new Array(planeLump.filelen / dplane_t.size);

	for (var i = 0; i < planes.length; i++) {
		var plane = planes[i] = new Plane();

		plane.normal = [bb.readFloat(), bb.readFloat(), bb.readFloat()]
		plane.dist = bb.readFloat();
		plane.signbits = GetPlaneSignbits(plane);
		plane.type = PlaneTypeForNormal(plane.normal);
	}
}

function LoadNodesAndLeafs(buffer, nodeLump, leafLump, leafSurfacesLump) {
	var world = re.world;
	var planes = world.planes;
	var bb = new ByteBuffer(buffer, ByteBuffer.LITTLE_ENDIAN);

	var setParent_r = function (node, parent) {
		node.parent = parent;
		if (!node.children) {
			return;
		}
		setParent_r(node.children[0], node);
		setParent_r(node.children[1], node);
	};

	var numNodes = nodeLump.filelen / dnode_t.size;
	var numLeafs = leafLump.filelen / dleaf_t.size;
	var allNodes = world.nodes = new Array(numNodes + numLeafs);

	// Go ahead and create node / leaf objects so we can wire up
	// the children references.	
	for (var i = 0; i < numNodes; i++) {
		allNodes[i] = new mnode_t();
	}
	for (var i = numNodes; i < numNodes + numLeafs; i++) {
		allNodes[i] = new mleaf_t();
	}

	// Load leaf surfaces.
	bb.index = leafSurfacesLump.fileofs;

	var leafSurfaces = re.world.leafSurfaces = new Array(leafSurfacesLump.filelen / 4);
	for (var i = 0; i < leafSurfaces.length; i++) {
		leafSurfaces[i] = bb.readInt();
	}

	// Load nodes.
	bb.index = nodeLump.fileofs;

	for (var i = 0; i < numNodes; i++) {
		var node = allNodes[i];
		
		var planeNum = bb.readInt();
		var childrenNum = [bb.readInt(), bb.readInt()];
		var mins = [bb.readInt(), bb.readInt(), bb.readInt()];
		var maxs = [bb.readInt(), bb.readInt(), bb.readInt()];

		node.plane = planes[planeNum];
		node.children = new Array(2);
		for (var j = 0; j < 2; j++) {
			var p = childrenNum[j];

			if (p >= 0) {
				node.children[j] = allNodes[p];
			} else {
				node.children[j] = allNodes[numNodes + (-1 - p)];
			}
		}
		vec3.set(mins, node.mins);
		vec3.set(maxs, node.maxs);
	}

	// Load leafs.
	bb.index = leafLump.fileofs;

	for (var i = numNodes; i < numNodes + numLeafs; i++) {
		var leaf = allNodes[i];

		leaf.cluster = bb.readInt();
		leaf.area = bb.readInt();
		leaf.mins = [bb.readInt(), bb.readInt(), bb.readInt()];
		leaf.maxs = [bb.readInt(), bb.readInt(), bb.readInt()];
		leaf.firstLeafSurface = bb.readInt();
		leaf.numLeafSurfaces = bb.readInt();
		leaf.firstLeafBrush = bb.readInt();
		leaf.numLeafBrushes = bb.readInt();

		if (leaf.cluster >= world.numClusters ) {
			world.numClusters = leaf.cluster + 1;
		}
	}

	// chain decendants
	setParent_r(allNodes[0], null);
}

function LoadVisibility(buffer, visLump) {
	var world = re.world;
	var bb = new ByteBuffer(buffer, ByteBuffer.LITTLE_ENDIAN);
	bb.index = visLump.fileofs;

	world.numClusters = bb.readInt();
	world.clusterBytes = bb.readInt();

	var vissize = world.numClusters * world.clusterBytes;
	world.vis = new Uint8Array(vissize);

	for (var i = 0; i < vissize; i++) {
		world.vis[i] = bb.readUnsignedByte();
	}
}
	var MAX_GRID_SIZE = 129;

function LerpDrawVert(a, b, out) {
	out.pos[0] = 0.5 * (a.pos[0] + b.pos[0]);
	out.pos[1] = 0.5 * (a.pos[1] + b.pos[1]);
	out.pos[2] = 0.5 * (a.pos[2] + b.pos[2]);

	out.lmCoord[0] = 0.5 * (a.lmCoord[0] + b.lmCoord[0]);
	out.lmCoord[1] = 0.5 * (a.lmCoord[1] + b.lmCoord[1]);

	out.texCoord[0] = 0.5 * (a.texCoord[0] + b.texCoord[0]);
	out.texCoord[1] = 0.5 * (a.texCoord[1] + b.texCoord[1]);

	out.color[0] = (a.color[0] + b.color[0]) >> 1;
	out.color[1] = (a.color[1] + b.color[1]) >> 1;
	out.color[2] = (a.color[2] + b.color[2]) >> 1;
	out.color[3] = (a.color[3] + b.color[3]) >> 1;
}

function Transpose(ctrl, width, height) {
	var temp;

	if (width > height) {
		for (var i = 0; i < height; i++) {
			for (var j = i + 1; j < width; j++) {
				if (j < height) {
					// swap the value
					temp = ctrl[j][i];
					ctrl[j][i] = ctrl[i][j];
					ctrl[i][j] = temp;
				} else {
					// just copy
					ctrl[j][i] = ctrl[i][j];
				}
			}
		}
	} else {
		for (var i = 0; i < width; i++) {
			for (var j = i + 1; j < height; j++) {
				if (j < width) {
					// swap the value
					temp = ctrl[i][j];
					ctrl[i][j] = ctrl[j][i];
					ctrl[j][i] = temp;
				} else {
					// just copy
					ctrl[i][j] = ctrl[j][i];
				}
			}
		}
	}

}

function PutPointsOnCurve(ctrl, width, height) {
	var prev = {pos: [0,0,0], lmCoord: [0,0], texCoord: [0, 0], color: [0, 0, 0, 0], normal: [0, 0, 1]};
	var next = {pos: [0,0,0], lmCoord: [0,0], texCoord: [0, 0], color: [0, 0, 0, 0], normal: [0, 0, 1]};

	for (var i = 0; i < width; i++) {
		for (var j = 1; j < height; j += 2) {
			LerpDrawVert(ctrl[j][i], ctrl[j-1][i], prev);
			LerpDrawVert(ctrl[j][i], ctrl[j+1][i], next);
			LerpDrawVert(prev, next, ctrl[j][i]);
		}
	}

	for (var j = 0; j < height; j++) {
		for (var i = 1; i < width; i += 2) {
			LerpDrawVert(ctrl[j][i], ctrl[j][i-1], prev);
			LerpDrawVert(ctrl[j][i], ctrl[j][i+1], next);
			LerpDrawVert(prev, next, ctrl[j][i]);
		}
	}
}

/**
 * Tessellate a bezier patch.
 *
 * Most implementations take the patch's control points and step across 0...1 some fixed
 * amount, generating new vertices along the curve. This approach works, but doesn't treat
 * small and large curves alike, creating more vertices than necessary for smaller patches
 * more vertices and not enough for larger patches. 
 * 
 * What this approach does is subdivide the control points with LerpDrawVert, and check
 * the distance of the subdivided midpoints from the actual point on the curve. Once the
 * distance is within an acceptable range, it stops subdividing.
 */
function SubdividePatchToGrid(points, width, height, subdivisions) {
	var ctrl = new Array(MAX_GRID_SIZE);
	for (var i = 0; i < MAX_GRID_SIZE; i++) {
		ctrl[i] = new Array(MAX_GRID_SIZE);
	}

	// Convert points to multidimensional array to work with.
	for (var j = 0; j < width ; j++) {
		for (var i = 0; i < height; i++) {
			ctrl[i][j] = points[i*width+j];
		}
	}

	for (var rot = 0; rot < 2; rot++) {
		for (var j = 0; j + 2 < width; j += 2) {
			// Check subdivided midpoints against control points.
			var maxLen = 0;
			for (var i = 0; i < height; i++) {
				// Calculate the point on the curve using the biquadratic bezier equation:
				// (1–t)^2*P0 + 2*(1–t)*t*P1 + t^2*P2
				// We're using a simplified version as t is always 0.5 in this case.
				var midxyz = [0, 0, 0];
				for (var l = 0; l < 3; l++) {
					midxyz[l] = (ctrl[i][j].pos[l] + ctrl[i][j+1].pos[l] * 2 + ctrl[i][j+2].pos[l]) * 0.25;
				}

				// see how far off the line it is
				// using dist-from-line will not account for internal
				// texture warping, but it gives a lot less polygons than
				// dist-from-midpoint
				vec3.subtract(midxyz, ctrl[i][j].pos);

				var dir = vec3.subtract(ctrl[i][j+2].pos, ctrl[i][j].pos, [0, 0, 0]);
				vec3.normalize(dir);

				var d = vec3.dot(midxyz, dir);
				var projected = vec3.scale(dir, d, [0, 0, 0]);
				var midxyz2 = vec3.subtract(midxyz, projected);
				var len = vec3.length(midxyz2);
				if (len > maxLen) {
					maxLen = len;
				}
			}

			// If all the points are on the lines, remove the entire columns.
			if (maxLen < 0.1) {
				continue;
			}

			// See if we want to insert subdivided columns.
			if (width + 2 > MAX_GRID_SIZE) {
				continue;
			}

			// Stop subdividing.
			if (maxLen <= subdivisions) {
				continue;
			}

			// Insert two columns and replace the peak.
			width += 2;

			for (var i = 0; i < height; i++ ) {
				var prev = {pos: [0,0,0], lmCoord: [0,0], texCoord: [0, 0], color: [0, 0, 0, 0], normal: [0, 0, 1]};
				var next = {pos: [0,0,0], lmCoord: [0,0], texCoord: [0, 0], color: [0, 0, 0, 0], normal: [0, 0, 1]};
				var mid =  {pos: [0,0,0], lmCoord: [0,0], texCoord: [0, 0], color: [0, 0, 0, 0], normal: [0, 0, 1]};

				LerpDrawVert(ctrl[i][j],   ctrl[i][j+1], prev);
				LerpDrawVert(ctrl[i][j+1], ctrl[i][j+2], next);
				LerpDrawVert(prev,         next,         mid);

				// Shift array over by 2 to make way for the new control points.
				for (var k = width - 1; k > j + 3; k--) {
					ctrl[i][k] = ctrl[i][k-2];
				}

				ctrl[i][j+1] = prev;
				ctrl[i][j+2] = mid;
				ctrl[i][j+3] = next;
			}

			// Back up and recheck this set again, it may need more subdivision.
			j -= 2;
		}

		// Transpose the array and tesselate in the other direction.
		Transpose(ctrl, width, height);
		var t = width;
		width = height;
		height = t;
	}

	// Put all the approximating points on the curve.
	PutPointsOnCurve(ctrl, width, height);

	// Convert back to a flat array.
	var verts = new Array(width*height);
	for (var i = 0; i < height; i++) {
		for (var j = 0; j < width; j++) {
			verts[i*width+j] = ctrl[i][j];
		}
	}

	return {
		verts: verts,
		width: width,
		height: height
	};
}
	var defaultVertexShaderSrc = '\
	#ifdef GL_ES \n\
	precision highp float; \n\
	#endif \n\
	attribute vec3 position; \n\
	attribute vec3 normal; \n\
	attribute vec2 texCoord; \n\
	attribute vec2 lightCoord; \n\
	attribute vec4 color; \n\
\n\
	varying vec2 vTexCoord; \n\
	varying vec2 vLightmapCoord; \n\
	varying vec4 vColor; \n\
\n\
	uniform mat4 modelViewMat; \n\
	uniform mat4 projectionMat; \n\
\n\
	void main(void) { \n\
		vec4 worldPosition = modelViewMat * vec4(position, 1.0); \n\
		vTexCoord = texCoord; \n\
		vColor = color; \n\
		vLightmapCoord = lightCoord; \n\
		gl_Position = projectionMat * worldPosition; \n\
	} \n\
';

var defaultFragmentShaderSrc = '\
	#ifdef GL_ES \n\
	precision highp float; \n\
	#endif \n\
	varying vec2 vTexCoord; \n\
	varying vec2 vLightmapCoord; \n\
	uniform sampler2D texture; \n\
	uniform sampler2D lightmap; \n\
\n\
	void main(void) { \n\
		vec4 diffuseColor = texture2D(texture, vTexCoord); \n\
		vec4 lightColor = texture2D(lightmap, vLightmapCoord); \n\
		gl_FragColor = vec4(diffuseColor.rgb * lightColor.rgb, diffuseColor.a); \n\
	} \n\
';

var modelFragmnetShaderSrc = '\
	#ifdef GL_ES \n\
	precision highp float; \n\
	#endif \n\
	varying vec2 vTexCoord; \n\
	varying vec4 vColor; \n\
	uniform sampler2D texture; \n\
\n\
	void main(void) { \n\
		vec4 diffuseColor = texture2D(texture, vTexCoord); \n\
		gl_FragColor = vec4(diffuseColor.rgb * vColor.rgb, diffuseColor.a); \n\
	} \n\
';

/**
 * WebGL Shader builder utility
 */
var ShaderBuilder = function() {
	this.attrib = {};
	this.varying = {};
	this.uniform = {};
	this.functions = {};
	this.statements = [];
};

ShaderBuilder.prototype.addAttribs = function(attribs) {
	for (var name in attribs) {
		this.attrib[name] = 'attribute ' + attribs[name] + ' ' + name + ';'
	}
};

ShaderBuilder.prototype.addVaryings = function(varyings) {
	for (var name in varyings) {
		this.varying[name] = 'varying ' + varyings[name] + ' ' + name + ';'
	}
};

ShaderBuilder.prototype.addUniforms = function(uniforms) {
	for (var name in uniforms) {
		this.uniform[name] = 'uniform ' + uniforms[name] + ' ' + name + ';'
	}
};

ShaderBuilder.prototype.addFunction = function(name, lines) {
	this.functions[name] = lines.join('\n');
};

ShaderBuilder.prototype.addLines = function(statements) {
	for (var i = 0; i < statements.length; ++i) {
		this.statements.push(statements[i]);
	}
};

ShaderBuilder.prototype.getSource = function() {
	var src = '\
	#ifdef GL_ES \n\
	precision highp float; \n\
	#endif \n';

	for (var i in this.attrib) {
		src += this.attrib[i] + '\n';
	}

	for (var i in this.varying) {
		src += this.varying[i] + '\n';
	}

	for (var i in this.uniform) {
		src += this.uniform[i] + '\n';
	}

	for (var i in this.functions) {
		src += this.functions[i] + '\n';
	}

	src += 'void main(void) {\n\t';
	src += this.statements.join('\n\t');
	src += '\n}\n';

	return src;
};

ShaderBuilder.prototype.addWaveform = function(name, wf, timeVar) {
	if (!wf) {
		this.statements.push('float ' + name + ' = 0.0;');
		return;
	}

	if (!timeVar) { timeVar = 'time'; }

	if (typeof(wf.phase) == "number") {
		wf.phase = wf.phase.toFixed(4)
	}

	switch (wf.funcName) {
		case 'sin':
		this.statements.push('float ' + name + ' = ' + wf.base.toFixed(4) + ' + sin((' + wf.phase + ' + ' + timeVar + ' * ' + wf.freq.toFixed(4) + ') * 6.283) * ' + wf.amp.toFixed(4) + ';');
		return;
		case 'square': funcName = 'square'; this.addSquareFunc(); break;
		case 'triangle': funcName = 'triangle'; this.addTriangleFunc(); break;
		case 'sawtooth': funcName = 'fract'; break;
		case 'inversesawtooth': funcName = '1.0 - fract'; break;
		default:
		this.statements.push('float ' + name + ' = 0.0;');
		return;
	}

	this.statements.push('float ' + name + ' = ' + wf.base.toFixed(4) + ' + ' + funcName + '(' + wf.phase + ' + ' + timeVar + ' * ' + wf.freq.toFixed(4) + ') * ' + wf.amp.toFixed(4) + ';');
};

ShaderBuilder.prototype.addSquareFunc = function() {
	this.addFunction('square', [
		'float square(float val) {',
		'   return (mod(floor(val*2.0)+1.0, 2.0) * 2.0) - 1.0;',
		'}',
	]);
};

ShaderBuilder.prototype.addTriangleFunc = function() {
	this.addFunction('triangle', [
		'float triangle(float val) {',
		'   return abs(2.0 * fract(val) - 1.0);',
		'}',
	]);
};

/**
 * WebGL Shader program compilation.
 */
function CompileShaderProgram(vertexSrc, fragmentSrc) {
	var fragmentShader = gl.createShader(gl.FRAGMENT_SHADER);
	gl.shaderSource(fragmentShader, fragmentSrc);
	gl.compileShader(fragmentShader);

	if (!gl.getShaderParameter(fragmentShader, gl.COMPILE_STATUS)) {
		gl.deleteShader(fragmentShader);
		return null;
	}

	var vertexShader = gl.createShader(gl.VERTEX_SHADER);
	gl.shaderSource(vertexShader, vertexSrc);
	gl.compileShader(vertexShader);

	if (!gl.getShaderParameter(vertexShader, gl.COMPILE_STATUS)) {
		gl.deleteShader(vertexShader);
		return null;
	}

	var shaderProgram = gl.createProgram();
	gl.attachShader(shaderProgram, vertexShader);
	gl.attachShader(shaderProgram, fragmentShader);
	gl.linkProgram(shaderProgram);

	if (!gl.getProgramParameter(shaderProgram, gl.LINK_STATUS)) {
		gl.deleteProgram(shaderProgram);
		gl.deleteShader(vertexShader);
		gl.deleteShader(fragmentShader);
		return null;
	}

	var i, attrib, uniform;
	var attribCount = gl.getProgramParameter(shaderProgram, gl.ACTIVE_ATTRIBUTES);
	shaderProgram.attrib = {};
	for (i = 0; i < attribCount; i++) {
		attrib = gl.getActiveAttrib(shaderProgram, i);
		shaderProgram.attrib[attrib.name] = gl.getAttribLocation(shaderProgram, attrib.name);
	}

	var uniformCount = gl.getProgramParameter(shaderProgram, gl.ACTIVE_UNIFORMS);
	shaderProgram.uniform = {};
	for (i = 0; i < uniformCount; i++) {
		uniform = gl.getActiveUniform(shaderProgram, i);
		shaderProgram.uniform[uniform.name] = gl.getUniformLocation(shaderProgram, uniform.name);
	}

	return shaderProgram;
}

function GenerateVertexShader(stageShader, stage) {
	var shader = new ShaderBuilder();

	shader.addAttribs({
		position: 'vec3',
		normal: 'vec3',
		color: 'vec4',
	});

	shader.addVaryings({
		vTexCoord: 'vec2',
		vColor: 'vec4',
	});

	shader.addUniforms({
		modelViewMat: 'mat4',
		projectionMat: 'mat4',
		time: 'float',
	});

	if (stage.isLightmap) {
		shader.addAttribs({ lightCoord: 'vec2' });
	} else {
		shader.addAttribs({ texCoord: 'vec2' });
	}

	shader.addLines(['vec3 defPosition = position;']);

	for(var i = 0; i < stageShader.vertexDeforms.length; ++i) {
		var deform = stageShader.vertexDeforms[i];

		switch(deform.type) {
			case 'wave':
				var name = 'deform' + i;
				var offName = 'deformOff' + i;

				shader.addLines([
					'float ' + offName + ' = (position.x + position.y + position.z) * ' + deform.spread.toFixed(4) + ';'
				]);

				var phase = deform.waveform.phase;
				deform.waveform.phase = phase.toFixed(4) + ' + ' + offName;
				shader.addWaveform(name, deform.waveform);
				deform.waveform.phase = phase;

				shader.addLines([
					'defPosition += normal * ' + name + ';'
				]);
				break;
			default: break;
		}
	}

	shader.addLines(['vec4 worldPosition = modelViewMat * vec4(defPosition, 1.0);']);
	shader.addLines(['vColor = color;']);

	if (stage.tcGen == 'environment') {
		shader.addLines([
		'vec3 viewer = normalize(-worldPosition.xyz);',
		'float d = dot(normal, viewer);',
		'vec3 reflected = normal*2.0*d - viewer;',
		'vTexCoord = vec2(0.5, 0.5) + reflected.xy * 0.5;'
		]);
	} else {
		// Standard texturing
		if(stage.isLightmap) {
			shader.addLines(['vTexCoord = lightCoord;']);
		} else {
			shader.addLines(['vTexCoord = texCoord;']);
		}
	}

	// tcMods
	for(var i = 0; i < stage.tcMods.length; ++i) {
		var tcMod = stage.tcMods[i];
		switch(tcMod.type) {
		case 'rotate':
			shader.addLines([
			'float r = ' + tcMod.angle.toFixed(4) + ' * time;',
			'vTexCoord -= vec2(0.5, 0.5);',
			'vTexCoord = vec2(vTexCoord.s * cos(r) - vTexCoord.t * sin(r), vTexCoord.t * cos(r) + vTexCoord.s * sin(r));',
			'vTexCoord += vec2(0.5, 0.5);',
			]);
			break;
		case 'scroll':
			shader.addLines([
			'vTexCoord += vec2(' + tcMod.sSpeed.toFixed(4) + ' * time, ' + tcMod.tSpeed.toFixed(4) + ' * time);'
			]);
			break;
		case 'scale':
			shader.addLines([
			'vTexCoord *= vec2(' + tcMod.scaleX.toFixed(4) + ', ' + tcMod.scaleY.toFixed(4) + ');'
			]);
			break;
		case 'stretch':
			shader.addWaveform('stretchWave', tcMod.waveform);
			shader.addLines([
			'stretchWave = 1.0 / stretchWave;',
			'vTexCoord *= stretchWave;',
			'vTexCoord += vec2(0.5 - (0.5 * stretchWave), 0.5 - (0.5 * stretchWave));',
			]);
			break;
		case 'turb':
			var tName = 'turbTime' + i;
			shader.addLines([
			'float ' + tName + ' = ' + tcMod.turbulance.phase.toFixed(4) + ' + time * ' + tcMod.turbulance.freq.toFixed(4) + ';',
			'vTexCoord.s += sin( ( ( position.x + position.z )* 1.0/128.0 * 0.125 + ' + tName + ' ) * 6.283) * ' + tcMod.turbulance.amp.toFixed(4) + ';',
			'vTexCoord.t += sin( ( position.y * 1.0/128.0 * 0.125 + ' + tName + ' ) * 6.283) * ' + tcMod.turbulance.amp.toFixed(4) + ';'
			]);
			break;
		default: break;
		}
	}

	switch(stage.alphaGen) {
		case 'lightingspecular':
		shader.addAttribs({ lightCoord: 'vec2' });
		shader.addVaryings({ vLightCoord: 'vec2' });
		shader.addLines([ 'vLightCoord = lightCoord;' ]);
		break;
		default:
		break;
	}

	shader.addLines(['gl_Position = projectionMat * worldPosition;']);

	return shader.getSource();
}

function GenerateFragmentShader(stageShader, stage) {
	var shader = new ShaderBuilder();

	shader.addVaryings({
		vTexCoord: 'vec2',
		vColor: 'vec4',
	});

	shader.addUniforms({
		texture: 'sampler2D',
		time: 'float',
	});

	shader.addLines(['vec4 texColor = texture2D(texture, vTexCoord.st);']);

	switch(stage.rgbGen) {
		case 'vertex':
		shader.addLines(['vec3 rgb = texColor.rgb * vColor.rgb;']);
		break;
		case 'wave':
		shader.addWaveform('rgbWave', stage.rgbWaveform);
		shader.addLines(['vec3 rgb = texColor.rgb * rgbWave;']);
		break;
		default:
		shader.addLines(['vec3 rgb = texColor.rgb;']);
		break;
	}

	switch(stage.alphaGen) {
		case 'wave':
		shader.addWaveform('alpha', stage.alphaWaveform);
		break;
		case 'lightingspecular':
		// For now this is VERY special cased. May not work well with all instances of lightingSpecular
		shader.addUniforms({
			lightmap: 'sampler2D'
		});
		shader.addVaryings({
			vLightCoord: 'vec2',
			vLight: 'float'
		});
		shader.addLines([
			'vec4 light = texture2D(lightmap, vLightCoord.st);',
			'rgb *= light.rgb;',
			'rgb += light.rgb * texColor.a * 0.6;', // This was giving me problems, so I'm ignorning an actual specular calculation for now
			'float alpha = 1.0;'
		]);
		break;
		default:
		shader.addLines(['float alpha = texColor.a;']);
		break;
	}

	if(stage.alphaFunc) {
		switch(stage.alphaFunc) {
		case 'GT0':
			shader.addLines([
			'if(alpha == 0.0) { discard; }'
			]);
			break;
		case 'LT128':
			shader.addLines([
			'if(alpha >= 0.5) { discard; }'
			]);
			break;
		case 'GE128':
			shader.addLines([
			'if(alpha < 0.5) { discard; }'
			]);
			break;
		default:
			break;
		}
	}

	shader.addLines(['gl_FragColor = vec4(rgb, alpha);']);

	return shader.getSource();
}

/**
 * Helper translation functions.
 */
function TranslateDepthFunc(depth) {
	if(!depth) { return gl.LEQUAL; }

	switch (depth.toLowerCase()) {
		case 'gequal': return gl.GEQUAL;
		case 'lequal': return gl.LEQUAL;
		case 'equal': return gl.EQUAL;
		case 'greater': return gl.GREATER;
		case 'less': return gl.LESS;
		default: return gl.LEQUAL;
	}
}

function TranslateCull(cull) {
	if (!cull) { return gl.FRONT; }

	cull = cull.toLowerCase();

	if (cull == 'none' || cull == 'twosided' || cull == 'disable') {
		return null;
	} else if (cull == 'back' || cull == 'backside' || cull == 'backsided') {
		return gl.BACK;
	}
}

function TranslateBlend(blend) {
	if(!blend) { return gl.ONE; }

	switch (blend.toUpperCase()) {
		case 'GL_ONE': return gl.ONE;
		case 'GL_ZERO': return gl.ZERO;
		case 'GL_DST_COLOR': return gl.DST_COLOR;
		case 'GL_ONE_MINUS_DST_COLOR': return gl.ONE_MINUS_DST_COLOR;
		case 'GL_SRC_ALPHA ': return gl.SRC_ALPHA;
		case 'GL_ONE_MINUS_SRC_ALPHA': return gl.ONE_MINUS_SRC_ALPHA;
		case 'GL_SRC_COLOR': return gl.SRC_COLOR;
		case 'GL_ONE_MINUS_SRC_COLOR': return gl.ONE_MINUS_SRC_COLOR;
		default: return gl.ONE;
	}
}

var GLShader = function () {
	this.name   = null;
	this.cull   = gl.FRONT;
	this.blend  = false;
	this.stages = [];
};

var defaultProgram = null;
var modelProgram = null;

function CompileShader(shader, lightmapIndex) {
	if (!defaultProgram) defaultProgram = CompileShaderProgram(defaultVertexShaderSrc, defaultFragmentShaderSrc);
	if (!modelProgram) modelProgram = CompileShaderProgram(defaultVertexShaderSrc, modelFragmnetShaderSrc);

	var glshader = new GLShader();

	glshader.name = shader.name;
	glshader.cull = TranslateCull(shader.cull);
	glshader.sort = shader.sort;
	glshader.blend = shader.blend;
	glshader.sky = shader.sky;
	glshader.lightmap = shader.lightmap;

	for (var i = 0; i < shader.stages.length; i++) {
		var stage = shader.stages[i];

		var glstage = _.clone(stage);
		glstage.blendSrc = TranslateBlend(stage.blendSrc);
		glstage.blendDest = TranslateBlend(stage.blendDest);
		glstage.depthFunc = TranslateDepthFunc(stage.depthFunc);

		// Optimize and use default programs when we can.
		// TODO We should move the default shaders over to re-shader instead of this hack.
		if (shader.stages.length === 1 && shader.opaque === true) {
			glstage.program = lightmapIndex === LightmapType.VERTEX ? modelProgram : defaultProgram;
		} else {
			var vertexSrc = GenerateVertexShader(shader, stage);
			var fragmentSrc = GenerateFragmentShader(shader, stage);
			glstage.program = CompileShaderProgram(vertexSrc, fragmentSrc);
		}

		glshader.stages.push(glstage);
	}

	return glshader;
}

function SetShader(glshader) {
	if (!glshader) {
		gl.enable(gl.CULL_FACE);
		gl.cullFace(gl.BACK);
	} else if (glshader.cull && !glshader.sky) {
		gl.enable(gl.CULL_FACE);
		gl.cullFace(glshader.cull);
	} else {
		gl.disable(gl.CULL_FACE);
	}

	return true;
}

function SetShaderStage(glshader, stage, time) {
	gl.blendFunc(stage.blendSrc, stage.blendDest);

	if (stage.depthWrite && !glshader.sky) {
		gl.depthMask(true);
	} else {
		gl.depthMask(false);
	}

	gl.depthFunc(stage.depthFunc);
	gl.useProgram(stage.program);

	var texture;
	if (stage.animFreq) {
		var animFrame = Math.floor(time * stage.animFreq) % stage.animMaps.length;
		texture = stage.animTextures[animFrame];
	} else {
		texture = stage.texture;
	}

	gl.activeTexture(gl.TEXTURE0);
	gl.uniform1i(stage.program.uniform.texture, 0);
	gl.bindTexture(gl.TEXTURE_2D, texture.texnum);

	if (stage.program.uniform.lightmap) {
		var lightmap = FindImage('*lightmap');
		gl.activeTexture(gl.TEXTURE1);
		gl.uniform1i(stage.program.uniform.lightmap, 1);;
		gl.bindTexture(gl.TEXTURE_2D, lightmap.texnum);
	}

	if (stage.program.uniform.time) {
		gl.uniform1f(stage.program.uniform.time, time);
	}
}
	var images = {};

function InitImages() {
	BuildWhiteTexture();
	BuildDefaultTexture();
}

function DeleteTextures() {
	/*for (var i = 0; i < tr.numImages ; i++) {
		qglDeleteTextures( 1, &tr.images[i]->texnum );
	}

	Com_Memset( tr.images, 0, sizeof( tr.images ) );

	tr.numImages = 0;

	Com_Memset( glState.currenttextures, 0, sizeof( glState.currenttextures ) );

	if ( qglActiveTextureARB ) {
		GL_SelectTexture( 1 );
		qglBindTexture( GL_TEXTURE_2D, 0 );
		GL_SelectTexture( 0 );
		qglBindTexture( GL_TEXTURE_2D, 0 );
	} else {
		qglBindTexture( GL_TEXTURE_2D, 0 );
	}*/
}

function FindImage(name, clamp) {
	//console.log('FindImage', name);
	// Only load .png files. Retrying on missing files is an expensive
	// operation in the browser.
	name = name.replace(/\.[^\.]+$/, '.png');

	// Try to find the image in our cache.
	var image;
	if ((image = images[name])) {
		return image;
	} else {
		var image = images[name] = new Texture();
		image.name = name;
		image.texnum = FindImage('*default').texnum;
	}

	// Load the image using the Image() class.
	var el = new Image();
	el.onload = function() {
		image.texnum = BuildTexture(el, null, null, clamp);
	};

	el.src = Q3W_BASE_FOLDER + '/' + name;

	return image;
}

function BuildWhiteTexture() {
	CreateImage('*white', new Uint8Array([255,255,255,255]), 1, 1);
}

function BuildDefaultTexture() {
	var image = images['*default'] = new Texture();
	image.name = name;

	var el = new Image();
	el.onload = function() {
		image.texnum = BuildTexture(el);
	};
	el.src = "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAEAAAABACAYAAACqaXHeAAAACXBIWXMAAAsTAAALEwEAmpwYAAAKT2lDQ1BQaG90b3Nob3AgSUNDIHByb2ZpbGUAAHjanVNnVFPpFj333vRCS4iAlEtvUhUIIFJCi4AUkSYqIQkQSoghodkVUcERRUUEG8igiAOOjoCMFVEsDIoK2AfkIaKOg6OIisr74Xuja9a89+bN/rXXPues852zzwfACAyWSDNRNYAMqUIeEeCDx8TG4eQuQIEKJHAAEAizZCFz/SMBAPh+PDwrIsAHvgABeNMLCADATZvAMByH/w/qQplcAYCEAcB0kThLCIAUAEB6jkKmAEBGAYCdmCZTAKAEAGDLY2LjAFAtAGAnf+bTAICd+Jl7AQBblCEVAaCRACATZYhEAGg7AKzPVopFAFgwABRmS8Q5ANgtADBJV2ZIALC3AMDOEAuyAAgMADBRiIUpAAR7AGDIIyN4AISZABRG8lc88SuuEOcqAAB4mbI8uSQ5RYFbCC1xB1dXLh4ozkkXKxQ2YQJhmkAuwnmZGTKBNA/g88wAAKCRFRHgg/P9eM4Ors7ONo62Dl8t6r8G/yJiYuP+5c+rcEAAAOF0ftH+LC+zGoA7BoBt/qIl7gRoXgugdfeLZrIPQLUAoOnaV/Nw+H48PEWhkLnZ2eXk5NhKxEJbYcpXff5nwl/AV/1s+X48/Pf14L7iJIEyXYFHBPjgwsz0TKUcz5IJhGLc5o9H/LcL//wd0yLESWK5WCoU41EScY5EmozzMqUiiUKSKcUl0v9k4t8s+wM+3zUAsGo+AXuRLahdYwP2SycQWHTA4vcAAPK7b8HUKAgDgGiD4c93/+8//UegJQCAZkmScQAAXkQkLlTKsz/HCAAARKCBKrBBG/TBGCzABhzBBdzBC/xgNoRCJMTCQhBCCmSAHHJgKayCQiiGzbAdKmAv1EAdNMBRaIaTcA4uwlW4Dj1wD/phCJ7BKLyBCQRByAgTYSHaiAFiilgjjggXmYX4IcFIBBKLJCDJiBRRIkuRNUgxUopUIFVIHfI9cgI5h1xGupE7yAAygvyGvEcxlIGyUT3UDLVDuag3GoRGogvQZHQxmo8WoJvQcrQaPYw2oefQq2gP2o8+Q8cwwOgYBzPEbDAuxsNCsTgsCZNjy7EirAyrxhqwVqwDu4n1Y8+xdwQSgUXACTYEd0IgYR5BSFhMWE7YSKggHCQ0EdoJNwkDhFHCJyKTqEu0JroR+cQYYjIxh1hILCPWEo8TLxB7iEPENyQSiUMyJ7mQAkmxpFTSEtJG0m5SI+ksqZs0SBojk8naZGuyBzmULCAryIXkneTD5DPkG+Qh8lsKnWJAcaT4U+IoUspqShnlEOU05QZlmDJBVaOaUt2ooVQRNY9aQq2htlKvUYeoEzR1mjnNgxZJS6WtopXTGmgXaPdpr+h0uhHdlR5Ol9BX0svpR+iX6AP0dwwNhhWDx4hnKBmbGAcYZxl3GK+YTKYZ04sZx1QwNzHrmOeZD5lvVVgqtip8FZHKCpVKlSaVGyovVKmqpqreqgtV81XLVI+pXlN9rkZVM1PjqQnUlqtVqp1Q61MbU2epO6iHqmeob1Q/pH5Z/YkGWcNMw09DpFGgsV/jvMYgC2MZs3gsIWsNq4Z1gTXEJrHN2Xx2KruY/R27iz2qqaE5QzNKM1ezUvOUZj8H45hx+Jx0TgnnKKeX836K3hTvKeIpG6Y0TLkxZVxrqpaXllirSKtRq0frvTau7aedpr1Fu1n7gQ5Bx0onXCdHZ4/OBZ3nU9lT3acKpxZNPTr1ri6qa6UbobtEd79up+6Ynr5egJ5Mb6feeb3n+hx9L/1U/W36p/VHDFgGswwkBtsMzhg8xTVxbzwdL8fb8VFDXcNAQ6VhlWGX4YSRudE8o9VGjUYPjGnGXOMk423GbcajJgYmISZLTepN7ppSTbmmKaY7TDtMx83MzaLN1pk1mz0x1zLnm+eb15vft2BaeFostqi2uGVJsuRaplnutrxuhVo5WaVYVVpds0atna0l1rutu6cRp7lOk06rntZnw7Dxtsm2qbcZsOXYBtuutm22fWFnYhdnt8Wuw+6TvZN9un2N/T0HDYfZDqsdWh1+c7RyFDpWOt6azpzuP33F9JbpL2dYzxDP2DPjthPLKcRpnVOb00dnF2e5c4PziIuJS4LLLpc+Lpsbxt3IveRKdPVxXeF60vWdm7Obwu2o26/uNu5p7ofcn8w0nymeWTNz0MPIQ+BR5dE/C5+VMGvfrH5PQ0+BZ7XnIy9jL5FXrdewt6V3qvdh7xc+9j5yn+M+4zw33jLeWV/MN8C3yLfLT8Nvnl+F30N/I/9k/3r/0QCngCUBZwOJgUGBWwL7+Hp8Ib+OPzrbZfay2e1BjKC5QRVBj4KtguXBrSFoyOyQrSH355jOkc5pDoVQfujW0Adh5mGLw34MJ4WHhVeGP45wiFga0TGXNXfR3ENz30T6RJZE3ptnMU85ry1KNSo+qi5qPNo3ujS6P8YuZlnM1VidWElsSxw5LiquNm5svt/87fOH4p3iC+N7F5gvyF1weaHOwvSFpxapLhIsOpZATIhOOJTwQRAqqBaMJfITdyWOCnnCHcJnIi/RNtGI2ENcKh5O8kgqTXqS7JG8NXkkxTOlLOW5hCepkLxMDUzdmzqeFpp2IG0yPTq9MYOSkZBxQqohTZO2Z+pn5mZ2y6xlhbL+xW6Lty8elQfJa7OQrAVZLQq2QqboVFoo1yoHsmdlV2a/zYnKOZarnivN7cyzytuQN5zvn//tEsIS4ZK2pYZLVy0dWOa9rGo5sjxxedsK4xUFK4ZWBqw8uIq2Km3VT6vtV5eufr0mek1rgV7ByoLBtQFr6wtVCuWFfevc1+1dT1gvWd+1YfqGnRs+FYmKrhTbF5cVf9go3HjlG4dvyr+Z3JS0qavEuWTPZtJm6ebeLZ5bDpaql+aXDm4N2dq0Dd9WtO319kXbL5fNKNu7g7ZDuaO/PLi8ZafJzs07P1SkVPRU+lQ27tLdtWHX+G7R7ht7vPY07NXbW7z3/T7JvttVAVVN1WbVZftJ+7P3P66Jqun4lvttXa1ObXHtxwPSA/0HIw6217nU1R3SPVRSj9Yr60cOxx++/p3vdy0NNg1VjZzG4iNwRHnk6fcJ3/ceDTradox7rOEH0x92HWcdL2pCmvKaRptTmvtbYlu6T8w+0dbq3nr8R9sfD5w0PFl5SvNUyWna6YLTk2fyz4ydlZ19fi753GDborZ752PO32oPb++6EHTh0kX/i+c7vDvOXPK4dPKy2+UTV7hXmq86X23qdOo8/pPTT8e7nLuarrlca7nuer21e2b36RueN87d9L158Rb/1tWeOT3dvfN6b/fF9/XfFt1+cif9zsu72Xcn7q28T7xf9EDtQdlD3YfVP1v+3Njv3H9qwHeg89HcR/cGhYPP/pH1jw9DBY+Zj8uGDYbrnjg+OTniP3L96fynQ89kzyaeF/6i/suuFxYvfvjV69fO0ZjRoZfyl5O/bXyl/erA6xmv28bCxh6+yXgzMV70VvvtwXfcdx3vo98PT+R8IH8o/2j5sfVT0Kf7kxmTk/8EA5jz/GMzLdsAAAAgY0hSTQAAeiUAAICDAAD5/wAAgOkAAHUwAADqYAAAOpgAABdvkl/FRgAAAKtJREFUeNrs2ksKgDAMBcBUekePo8fRU9YbpAspfjrZSjYDj5SHZTtai2T2NUr6/Yyh+xH5fsS9/SUmHwAAAAAAMPOUlj8DPn/ne/siAAAAAAAAJp46+s7rA0QAAAAAAADoA/QBIgAAAAAAAN73Duj9H/D0ndYHiAAAAAAAABg29e93Xh8gAgAAAAAAIH0H6ANEAAAAAAAA6AP0ASIAAAAAAADmmgsAAP//AwCuazpEOXa+fwAAAABJRU5ErkJggg==";
}

function BuildTexture(buffer, width, height, clamp) {
	var texture = gl.createTexture();

	gl.bindTexture(gl.TEXTURE_2D, texture);

	if (buffer instanceof Image) {
		gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, buffer);
	} else if (buffer instanceof Uint8Array) {
		gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, width, height, 0, gl.RGBA, gl.UNSIGNED_BYTE, buffer);
	} else {
		gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, width, height, 0, gl.RGBA, gl.UNSIGNED_BYTE, null);

		for (var i = 0; i < buffer.length; i++) {
			var sub = buffer[i];
			gl.texSubImage2D(gl.TEXTURE_2D, 0, sub.x, sub.y, sub.width, sub.height, gl.RGBA, gl.UNSIGNED_BYTE, sub.buffer);
		}
	}

	gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
	gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR_MIPMAP_NEAREST);
	if (clamp) {
		gl.texParameterf(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
		gl.texParameterf(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
	}
	gl.generateMipmap(gl.TEXTURE_2D);

	return texture;
}

function CreateImage(name, buffer, width, height, clamp) {
	var image;

	// Since we load images asynchronously, if we're creating an image that
	// some surfaces may already reference, don't trash the reference.
	if (!(image = images[name])) {
		image = images[name] = new Texture();
		image.name = name;
	}

	image.texnum = BuildTexture(buffer, width, height, clamp);

	return image;
}
	// TODO We really need to clean up these q3shader/glshader differences.
function InitShaders() {
	ScanAndLoadShaderFiles();
}

function FindShader(shaderName, lightmapIndex) {
	var shader;

	if ((shader = re.compiledShaders[shaderName])) {
		return shader;
	}

	if (!(shader = re.parsedShaders[shaderName])) {
		// There is no shader for this name, let's create a default
		// diffuse shader and assume the name references a texture.
		var shader = new Q3Shader();
		var stage = new Q3ShaderStage();
		var map = shaderName !== '*default' ? shaderName + '.png' : shaderName;
		shader.name = map;
		shader.opaque = true;
		stage.map = map;
		shader.stages.push(stage);

		re.parsedShaders[shaderName] = shader;
	}

	// Go ahead and load the texture maps for this shader.
	// TODO We load shader textures here because we don't want to load images
	// for every shader when it's parsed (as we parse a lot of unused shaders).
	// If we made LoadShaderFile cache of key/value pairs of shader names
	// and their text, and delay parsing until in here, we can remove this
	// and reinstate it as part of ParseShader().
	LoadTexturesForShader(shader);

	shader.glshader = CompileShader(shader, lightmapIndex);

	// Add the shader to the sorted cache.
	SortShader(shader);

	return (re.compiledShaders[shaderName] = shader);
}

function LoadTexturesForShader(shader) {
	for(var i = 0; i < shader.stages.length; i++) {
		var stage = shader.stages[i];

		LoadTexturesForShaderStage(shader, stage);
	}
}

function LoadTexturesForShaderStage(shader, stage) {
	if (stage.animFreq) {
		stage.animTextures = _.map(stage.animMaps, function (map) {
			return FindImage(map, stage.clamp);
		});
	} else {
		if (!stage.map) {
			stage.texture = FindImage('*white');
		} else if (stage.map == '$lightmap') {
			if (shader.lightmap < 0) {
				stage.texture = FindImage('*white');
			} else {
				stage.texture = FindImage('*lightmap');
			}
		} else if (stage.map == '$whiteimage') {
			stage.texture = FindImage('*white');
		} else {
			stage.texture = FindImage(stage.map, stage.clamp);
		}
	}
}

function SortShader(shader) {
	var sortedShaders = re.sortedShaders;
	var sort = shader.sort;

	for (var i = sortedShaders.length - 1; i >= 0; i--) {
		if (sortedShaders[i].sort <= sort) {
			break;
		}
		sortedShaders[i+1] = sortedShaders[i];
		sortedShaders[i+1].sortedIndex++;
	}
	shader.sortedIndex = i+1;
	sortedShaders[i+1] = shader;
}

function ScanAndLoadShaderFiles() {
	var allShaders = [
		'scripts/base.shader', 'scripts/base_button.shader', 'scripts/base_floor.shader',
		'scripts/base_light.shader', 'scripts/base_object.shader', 'scripts/base_support.shader',
		'scripts/base_trim.shader', 'scripts/base_wall.shader', 'scripts/common.shader',
		'scripts/ctf.shader', 'scripts/eerie.shader', 'scripts/gfx.shader',
		'scripts/gothic_block.shader', 'scripts/gothic_floor.shader', 'scripts/gothic_light.shader',
		'scripts/gothic_trim.shader', 'scripts/gothic_wall.shader', 'scripts/hell.shader',
		'scripts/liquid.shader', 'scripts/menu.shader', 'scripts/models.shader',
		'scripts/organics.shader', 'scripts/sfx.shader', 'scripts/shrine.shader',
		'scripts/skin.shader', 'scripts/sky.shader', 'scripts/test.shader'
	];

	for (var i = 0; i < allShaders.length; ++i) {
		var path = Q3W_BASE_FOLDER + '/' + allShaders[i];
		LoadShaderFile(path);
	}
}

function LoadShaderFile(url, onload) {
	cl.ReadFile(url, 'utf8', function (data) {
		var tokens = new ShaderTokenizer(data);

		var shader;
		while ((shader = ParseShader(tokens))) {
			re.parsedShaders[shader.name] = shader;
		};
	});
}

/**
 * Shader parser
 */
var Q3Shader = function () {
	this.name          = null;
	this.cull          = 'front';
	this.sky           = false;
	this.blend         = false;
	this.opaque        = false;
	this.sort          = 0;
	this.stages        = [];
	this.vertexDeforms = [];
};

var Q3ShaderStage = function (map) {
	this.map           = null;
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
	this.animMaps      = [];
	this.animFreq      = 0;
	this.depthFunc     = 'lequal';
	this.depthWrite    = true;
	this.isLightmap    = false;
};

function ParseWaveform(tokens) {
	return {
		funcName: tokens.next().toLowerCase(),
		base: parseFloat(tokens.next()),
		amp: parseFloat(tokens.next()),
		phase: parseFloat(tokens.next()),
		freq: parseFloat(tokens.next())
	};
}

function ParseStage(tokens) {
	var stage = new Q3ShaderStage();

	// Parse a shader
	while (!tokens.EOF()) {
		var token = tokens.next();
		if(token == '}') { break; }

		switch(token.toLowerCase()) {
			case 'clampmap':
				stage.clamp = true;
			case 'map':
				stage.map = tokens.next().replace(/(\.jpg|\.tga)/, '.png');
				/*if (!stage.map) {
					stage.texture = findImage('*white');
				} else if (stage.map == '$lightmap') {
					if (shader.lightmap < 0) {
						stage.texture = findImage('*white');
					} else {
						stage.texture = findImage('*lightmap');
					}
				} else if (stage.map == '$whiteimage') {
					stage.texture = findImage('*white');
				} else {
					stage.texture = findImage(stage.map, stage.clamp);
				}*/
				break;

			case 'animmap':
				stage.animFrame = 0;
				stage.animFreq = parseFloat(tokens.next());
				var nextMap = tokens.next();
				while (nextMap.match(/(\.jpg|\.tga)/)) {
					var map = nextMap.replace(/(\.jpg|\.tga)/, '.png');
					stage.animMaps.push(map);
					//stage.animTexture.push(findImage(map, stage.clamp));
					nextMap = tokens.next();
				}
				tokens.prev();
				break;

			case 'rgbgen':
				stage.rgbGen = tokens.next().toLowerCase();;
				switch(stage.rgbGen) {
					case 'wave':
						stage.rgbWaveform = ParseWaveform(tokens);
						if(!stage.rgbWaveform) { stage.rgbGen == 'identity'; }
						break;
				};
				break;

			case 'alphagen':
				stage.alphaGen = tokens.next().toLowerCase();
				switch(stage.alphaGen) {
					case 'wave':
						stage.alphaWaveform = ParseWaveform(tokens);
						if(!stage.alphaWaveform) { stage.alphaGen == '1.0'; }
						break;
					default: break;
				};
				break;

			case 'alphafunc':
				stage.alphaFunc = tokens.next().toUpperCase();
				break;

			case 'blendfunc':
				stage.blendSrc = tokens.next();
				stage.hasBlendFunc = true;
				if(!stage.depthWriteOverride) {
					stage.depthWrite = false;
				}
				switch(stage.blendSrc) {
					case 'add':
						stage.blendSrc = 'GL_ONE';
						stage.blendDest = 'GL_ONE';
						break;

					case 'blend':
						stage.blendSrc = 'GL_SRC_ALPHA';
						stage.blendDest = 'GL_ONE_MINUS_SRC_ALPHA';
						break;

					case 'filter':
						stage.blendSrc = 'GL_DST_COLOR';
						stage.blendDest = 'GL_ZERO';
						break;

					default:
						stage.blendDest = tokens.next();
						break;
				}
				break;

			case 'depthfunc':
				stage.depthFunc = tokens.next().toLowerCase();
				break;

			case 'depthwrite':
				stage.depthWrite = true;
				stage.depthWriteOverride = true;
				break;

			case 'tcmod':
				var tcMod = {
					type: tokens.next().toLowerCase()
				}
				switch(tcMod.type) {
					case 'rotate':
						tcMod.angle = parseFloat(tokens.next()) * (3.1415/180);
						break;
					case 'scale':
						tcMod.scaleX = parseFloat(tokens.next());
						tcMod.scaleY = parseFloat(tokens.next());
						break;
					case 'scroll':
						tcMod.sSpeed = parseFloat(tokens.next());
						tcMod.tSpeed = parseFloat(tokens.next());
						break;
					case 'stretch':
						tcMod.waveform = ParseWaveform(tokens);
						if(!tcMod.waveform) { tcMod.type == null; }
						break;
					case 'turb':
						tcMod.turbulance = {
							base: parseFloat(tokens.next()),
							amp: parseFloat(tokens.next()),
							phase: parseFloat(tokens.next()),
							freq: parseFloat(tokens.next())
						};
						break;
					default: tcMod.type == null; break;
				}
				if(tcMod.type) {
					stage.tcMods.push(tcMod);
				}
				break;
			case 'tcgen':
				stage.tcGen = tokens.next();
				break;
			default: break;
		}
	}

	if(stage.blendSrc == 'GL_ONE' && stage.blendDest == 'GL_ZERO') {
		stage.hasBlendFunc = false;
		stage.depthWrite = true;
	}

	stage.isLightmap = stage.map == '$lightmap';

	return stage;
}

function ParseShader(tokens) {
	var shader = new Q3Shader();
	shader.name = tokens.next();

	// Sanity check.
	if (tokens.next() !== '{') return null;

	while (!tokens.EOF()) {
		var token = tokens.next().toLowerCase();

		if (token == '}') break;

		switch (token) {
			case '{': {
				var stage = ParseStage(tokens);

				// I really really really don't like doing this, which basically just forces lightmaps to use the 'filter' blendmode
				// but if I don't a lot of textures end up looking too bright. I'm sure I'm jsut missing something, and this shouldn't
				// be needed.
				if (stage.isLightmap && (stage.hasBlendFunc)) {
					stage.blendSrc = 'GL_DST_COLOR';
					stage.blendDest = 'GL_ZERO';
				}

				// I'm having a ton of trouble getting lightingSpecular to work properly,
				// so this little hack gets it looking right till I can figure out the problem
				if(stage.alphaGen == 'lightingspecular') {
					stage.blendSrc = 'GL_ONE';
					stage.blendDest = 'GL_ZERO';
					stage.hasBlendFunc = false;
					stage.depthWrite = true;
					shader.stages = [];
				}

				if(stage.hasBlendFunc) { shader.blend = true; } else { shader.opaque = true; }

				shader.stages.push(stage);
			} break;

			case 'cull':
				shader.cull = tokens.next();
				break;

			case 'deformvertexes':
				var deform = {
					type: tokens.next().toLowerCase()
				};

				switch (deform.type) {
					case 'wave':
						deform.spread = 1.0 / parseFloat(tokens.next());
						deform.waveform = ParseWaveform(tokens);
						break;
					default: 
						deform = null; 
						break;
				}

				if (deform) {
					shader.vertexDeforms.push(deform);
				}
				break;

			case 'sort':
				var sort = tokens.next().toLowerCase();
				switch(sort) {
					case 'portal':     shader.sort = ShaderSort.PORTAL;         break;
					case 'sky':        shader.sort = ShaderSort.ENVIRONMENT;    break;
					case 'opaque':     shader.sort = ShaderSort.OPAQUE;         break;
					case 'decal':      shader.sort = ShaderSort.DECAL;          break;
					case 'seeThrough': shader.sort = ShaderSort.SEE_THROUGH;    break;
					case 'banner':     shader.sort = ShaderSort.BANNER;         break;
					case 'additive':   shader.sort = ShaderSort.BLEND1;         break;
					case 'nearest':    shader.sort = ShaderSort.NEAREST;        break;
					case 'underwater': shader.sort = ShaderSort.UNDERWATER;     break;
					default:           shader.sort = parseInt(sort);    break;
				};
				break;

			case 'surfaceparm':
				var param = tokens.next().toLowerCase();

				switch (param) {
					case 'sky':
						shader.sky = true;
						break;
					default: break;
				}
				break;

			default: break;
		}
	}

	if (!shader.sort) {
		/*// see through item, like a grill or grate
		if (pStage->stateBits & GLS_DEPTHContentMasks.TRUE ) {
			shader.sort = ShaderSort.SEE_THROUGH;
		} else {
			shader.sort = ShaderSort.BLEND0;
		}*/
		if (shader.opaque) {
			shader.sort = ShaderSort.OPAQUE;
		} else {
			shader.sort = ShaderSort.BLEND0;
		}
	}

	return shader;
}

/**
 * Shader Tokenizer
 */
var ShaderTokenizer = function (src) {
	// Strip out comments
	src = src.replace(/\/\/.*$/mg, ''); // C++ style (//...)
	src = src.replace(/\/\*[^*\/]*\*\//mg, ''); // C style (/*...*/) (Do the shaders even use these?)
	this.tokens = src.match(/[^\s\n\r\"]+/mg);

	this.offset = 0;
};

ShaderTokenizer.prototype.EOF = function() {
	if(this.tokens === null) { return true; }
	var token = this.tokens[this.offset];
	while(token === '' && this.offset < this.tokens.length) {
		this.offset++;
		token = this.tokens[this.offset];
	}
	return this.offset >= this.tokens.length;
};

ShaderTokenizer.prototype.next = function() {
	if(this.tokens === null) { return ; }
	var token = '';
	while(token === '' && this.offset < this.tokens.length) {
		token = this.tokens[this.offset++];
	}
	return token;
};

ShaderTokenizer.prototype.prev = function() {
	if(this.tokens === null) { return ; }
	var token = '';
	while(token === '' && this.offset >= 0) {
		token = this.tokens[this.offset--];
	}
	return token;
};
	var q3render_sky_vertex_stride = 20;

var skyboxMat = mat4.create();
var skyboxBuffer = null;
var skyboxIndexBuffer = null;
var skyboxIndexCount;
var skyShader = null;

function BuildSkyboxBuffers() {
	var skyVerts = [
		-128, 128, 128, 0, 0,
		128, 128, 128, 1, 0,
		-128, -128, 128, 0, 1,
		128, -128, 128, 1, 1,

		-128, 128, 128, 0, 1,
		128, 128, 128, 1, 1,
		-128, 128, -128, 0, 0,
		128, 128, -128, 1, 0,

		-128, -128, 128, 0, 0,
		128, -128, 128, 1, 0,
		-128, -128, -128, 0, 1,
		128, -128, -128, 1, 1,

		128, 128, 128, 0, 0,
		128, -128, 128, 0, 1,
		128, 128, -128, 1, 0,
		128, -128, -128, 1, 1,

		-128, 128, 128, 1, 0,
		-128, -128, 128, 1, 1,
		-128, 128, -128, 0, 0,
		-128, -128, -128, 0, 1
	];

	var skyIndices = [
		0, 1, 2,
		1, 2, 3,

		4, 5, 6,
		5, 6, 7,

		8, 9, 10,
		9, 10, 11,

		12, 13, 14,
		13, 14, 15,

		16, 17, 18,
		17, 18, 19
	];

	skyboxBuffer = gl.createBuffer();
	gl.bindBuffer(gl.ARRAY_BUFFER, skyboxBuffer);
	gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(skyVerts), gl.STATIC_DRAW);

	skyboxIndexBuffer = gl.createBuffer();
	gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, skyboxIndexBuffer);
	gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, new Uint16Array(skyIndices), gl.STATIC_DRAW);

	skyboxIndexCount = skyIndices.length;
}
	function CreateElement() {
	var el = document.createElement('div');

	el.setAttribute('style', 'display: none;');

	viewportUi.appendChild(el);

	return el;
}

function DeleteElement(el) {
	el.parentNode.removeChild(element);
}

function DrawText(el, x, y, str) {
	el.setAttribute('style', 'position: absolute; top: ' + y + 'px; left: ' + x + 'px;');
	el.innerHTML = str;
}

// TODO This needs to be called before rendering each scene
// It should toggle non drawn to elements display.
function UpdateInterfaceSurfaces() {
}
	var q3render_vertex_stride = 56;

var vertexBuffer = null;
var indexBuffer = null;

function BuildWorldBuffers() {
	var faces = re.world.faces,
		verts = re.world.verts,
		meshVerts = re.world.meshVerts,
		shaders = re.world.shaders;

	// Compile vert list
	var vertices = new Array(verts.length*14);
	var offset = 0;
	for (var i = 0; i < verts.length; ++i) {
		var vert = verts[i];

		vertices[offset++] = vert.pos[0];
		vertices[offset++] = vert.pos[1];
		vertices[offset++] = vert.pos[2];

		vertices[offset++] = vert.texCoord[0];
		vertices[offset++] = vert.texCoord[1];

		vertices[offset++] = vert.lmCoord[0];
		vertices[offset++] = vert.lmCoord[1];

		vertices[offset++] = vert.normal[0];
		vertices[offset++] = vert.normal[1];
		vertices[offset++] = vert.normal[2];

		vertices[offset++] = vert.color[0];
		vertices[offset++] = vert.color[1];
		vertices[offset++] = vert.color[2];
		vertices[offset++] = vert.color[3];
	}

	// Compile index list
	var indices = new Array();

	for (var i = 0; i < faces.length; i++) {
		var face = faces[i];

		face.indexOffset = indices.length * 2; // Offset is in bytes

		for(var j = 0; j < face.meshVertCount; j++) {
			indices.push(face.vertex + meshVerts[face.meshVert + j]);
		}
	}

	vertexBuffer = gl.createBuffer();
	gl.bindBuffer(gl.ARRAY_BUFFER, vertexBuffer);
	gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(vertices), gl.STATIC_DRAW);

	indexBuffer = gl.createBuffer();
	gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, indexBuffer);
	gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, new Uint16Array(indices), gl.STATIC_DRAW);
}

/**
 * Helper functions to bind attributes to vertex arrays.
 */
function BindShaderAttribs(shader, modelViewMat, projectionMat) {
	// Set uniforms
	gl.uniformMatrix4fv(shader.uniform.modelViewMat, false, modelViewMat);
	gl.uniformMatrix4fv(shader.uniform.projectionMat, false, projectionMat);

	// Setup vertex attributes
	gl.enableVertexAttribArray(shader.attrib.position);
	gl.vertexAttribPointer(shader.attrib.position, 3, gl.FLOAT, false, q3render_vertex_stride, 0);

	if(shader.attrib.texCoord !== undefined) {
		gl.enableVertexAttribArray(shader.attrib.texCoord);
		gl.vertexAttribPointer(shader.attrib.texCoord, 2, gl.FLOAT, false, q3render_vertex_stride, 3*4);
	}

	if(shader.attrib.lightCoord !== undefined) {
		gl.enableVertexAttribArray(shader.attrib.lightCoord);
		gl.vertexAttribPointer(shader.attrib.lightCoord, 2, gl.FLOAT, false, q3render_vertex_stride, 5*4);
	}

	if(shader.attrib.normal !== undefined) {
		gl.enableVertexAttribArray(shader.attrib.normal);
		gl.vertexAttribPointer(shader.attrib.normal, 3, gl.FLOAT, false, q3render_vertex_stride, 7*4);
	}

	if(shader.attrib.color !== undefined) {
		gl.enableVertexAttribArray(shader.attrib.color);
		gl.vertexAttribPointer(shader.attrib.color, 4, gl.FLOAT, false, q3render_vertex_stride, 10*4);
	}
}

function BindSkyAttribs(shader, modelViewMat, projectionMat) {
	mat4.set(modelViewMat, skyboxMat);

	// Clear out the translation components
	skyboxMat[12] = 0;
	skyboxMat[13] = 0;
	skyboxMat[14] = 0;

	// Set uniforms
	gl.uniformMatrix4fv(shader.uniform.modelViewMat, false, skyboxMat);
	gl.uniformMatrix4fv(shader.uniform.projectionMat, false, projectionMat);

	// Setup vertex attributes
	gl.enableVertexAttribArray(shader.attrib.position);
	gl.vertexAttribPointer(shader.attrib.position, 3, gl.FLOAT, false, q3render_sky_vertex_stride, 0);

	if(shader.attrib.texCoord !== undefined) {
		gl.enableVertexAttribArray(shader.attrib.texCoord);
		gl.vertexAttribPointer(shader.attrib.texCoord, 2, gl.FLOAT, false, q3render_sky_vertex_stride, 3*4);
	}
}

/**
 *
 */
function PointInLeaf(p) {
	if (!re.world) {
		throw new Error('PointInLeaf: bad model');
	}

	var node = re.world.nodes[0];

	while (1) {		
		if (!node.children) {
			break;
		}
		var plane = node.plane;
		var d = vec3.dot(p, plane.normal) - plane.dist;

		if (d > 0) {
			node = node.children[0];
		} else {
			node = node.children[1];
		}
	}
	
	return node;
}

function ClusterVisible(current, test) {
	var world = re.world;

	if (!world || !world.vis || current === test || current == -1) {
		return true;
	}

	var offset = current * world.clusterBytes;
	return (world.vis[offset + (test >> 3)] & (1 << (test & 7))) !== 0;
}

function MarkLeaves() {
	var world = re.world;
	var nodes = world.nodes;

	// current viewcluster
	var leaf = PointInLeaf(re.viewParms.pvsOrigin);
	var cluster = leaf.cluster;

	// if the cluster is the same and the area visibility matrix
	// hasn't changed, we don't need to mark everything again
	if (re.viewCluster === cluster) {
		return;
	}

	re.viewCluster = cluster;
	re.visCount++;

	/*if (re.viewCluster == -1 ) {
		for (var i = 0, numNodes = nodes.length; i < numNodes; i++) {
			if (nodes[i].contents != ContentTypes.SOLID) {
				nodes[i].visframe = re.visCount;
			}
		}
		return;
	}*/

	for (var i = 0, numNodes = nodes.length; i < numNodes; i++) {
		var node = nodes[i];
		var cluster = node.cluster;

		if (cluster < 0 || cluster >= world.numClusters) {
			continue;
		}

		// check general pvs
		if (!ClusterVisible(re.viewCluster, cluster)) {
			continue;
		}

		// check for door connection
		/*if ( (tr.refdef.areamask[node->area>>3] & (1<<(node->area&7)) ) ) {
			continue;		// not visible
		}*/

		var parent = node;
		while (parent) {
			if (parent.visframe === re.visCount) {
				break;
			}
			parent.visframe = re.visCount;
			parent = parent.parent;
		}
	}
}

function AddWorldSurface(surf/*, dlightBits*/) {
	if (surf.viewCount === re.viewCount) {
		return; // already in this view
	}

	surf.viewCount = re.viewCount;

	// try to cull before dlighting or adding
	if (CullSurface(surf, surf.shader)) {
		return;
	}

	// check for dlighting
	/*if (dlightBits ) {
		dlightBits = DlightSurface(surf, dlightBits);
		dlightBits = (dlightBits !== 0);
	}*/

	AddDrawSurf(surf/*.data*/, surf.shader/*, surf.fogIndex, dlightBits*/);
}

/*
================
CullSurface

Tries to back face cull surfaces before they are lighted or
added to the sorting list.

This will also allow mirrors on both sides of a model without recursion.
================
*/
function CullSurface(surface, shader) {
	if (!r_cull()) {
		return false;
	}

	// TODO We don't convert to a render specific type yet.
	if (surface.type === SurfaceType.GRID/*SurfaceType.GRID*/) {
		//return R_CullGrid( (srfGridMesh_t *)surface );
		return false;
	}

	/*if ( *surface == SF_TRIANGLES ) {
		return R_CullTriSurf( (srfTriangles_t *)surface );
	}*/

	// TODO We don't convert to a render specific type yet.
	if (surface.type !== SurfaceType.FACE) {
		return false;
	}

	// TODO map shader cull value to enum
	if (shader.cull === 'twosided' || shader.cull === 'none' || shader.cull === 'disable') {
		return false;
	}

	var d = vec3.dot(re.viewParms.or.origin, surface.plane.normal);

	// Don't cull exactly on the plane, because there are levels of rounding
	// through the BSP, ICD, and hardware that may cause pixel gaps if an
	// epsilon isn't allowed here.
	if (shader.cull === 'front') {
		if (d < surface.plane.dist - 8) {
			return true;
		}
	} else {
		if (d > surface.plane.dist + 8) {
			return true;
		}
	}

	return false;
}

function RecursiveWorldNode(node, planeBits/*, dlightBits*/) {
	while (1) {
		// if the node wasn't marked as potentially visible, exit
		if (node.visframe != re.visCount) {
			return;
		}

		// if the bounding volume is outside the frustum, nothing
		// inside can be visible OPTIMIZE: don't do this all the way to leafs?
		if (true/*!r_nocull->integer*/) {
			var r;

			if (planeBits & 1) {
				r = BoxOnPlaneSide(node.mins, node.maxs, re.viewParms.frustum[0]);
				if (r === 2) {
					return;                      // culled
				} else if (r === 1) {
					planeBits &= ~1;             // all descendants will also be in front
				}
			}

			if (planeBits & 2) {
				r = BoxOnPlaneSide(node.mins, node.maxs, re.viewParms.frustum[1]);
				if (r === 2) {
					return;                      // culled
				} else if (r === 1) {
					planeBits &= ~2;             // all descendants will also be in front
				}
			}

			if (planeBits & 4) {
				r = BoxOnPlaneSide(node.mins, node.maxs, re.viewParms.frustum[2]);
				if (r === 2) {
					return;                      // culled
				} else if (r == 1) {
					planeBits &= ~4;             // all descendants will also be in front
				}
			}

			if (planeBits & 8) {
				r = BoxOnPlaneSide(node.mins, node.maxs, re.viewParms.frustum[3]);
				if (r === 2) {
					return;                      // culled
				} else if (r === 1 ) {
					planeBits &= ~8;             // all descendants will also be in front
				}
			}
		}

		if (!node.children) {
			break;
		}

		// node is just a decision point, so go down both sides
		// since we don't care about sort orders, just go positive to negative

		// determine which dlights are needed
		/*var newDlights = [0, 0];

		if (dlightBits) {
			int	i;

			for ( i = 0 ; i < tr.refdef.num_dlights ; i++ ) {
				dlight_t	*dl;
				float		dist;

				if ( dlightBits & ( 1 << i ) ) {
					dl = &tr.refdef.dlights[i];
					dist = DotProduct( dl->origin, node->plane->normal ) - node->plane->dist;
					
					if ( dist > -dl->radius ) {
						newDlights[0] |= ( 1 << i );
					}
					if ( dist < dl->radius ) {
						newDlights[1] |= ( 1 << i );
					}
				}
			}
		}*/

		// recurse down the children, front side first
		RecursiveWorldNode(node.children[0], planeBits/*, newDlights[0]*/);

		// tail recurse
		node = node.children[1];
		/*dlightBits = newDlights[1];*/
	}

	// add to z buffer bounds
	var parms = re.viewParms;

	if (node.mins[0] < parms.visBounds[0][0]) {
		parms.visBounds[0][0] = node.mins[0];
	}
	if (node.mins[1] < parms.visBounds[0][1]) {
		parms.visBounds[0][1] = node.mins[1];
	}
	if (node.mins[2] < parms.visBounds[0][2]) {
		parms.visBounds[0][2] = node.mins[2];
	}

	if (node.maxs[0] > parms.visBounds[1][0]) {
		parms.visBounds[1][0] = node.maxs[0];
	}
	if (node.maxs[1] > parms.visBounds[1][1]) {
		parms.visBounds[1][1] = node.maxs[1];
	}
	if (node.maxs[2] > parms.visBounds[1][2]) {
		parms.visBounds[1][2] = node.maxs[2];
	}

	// add the individual surfaces
	var faces = re.world.faces;
	var leafSurfaces = re.world.leafSurfaces;

	for (var i = 0; i < node.numLeafSurfaces; i++) {
		var face = faces[leafSurfaces[node.firstLeafSurface + i]];
		// The surface may have already been added if it spans multiple leafs.
		AddWorldSurface(face/*, dlightBits*/);
	}

	re.pc.leafs++;
}

function AddWorldSurfaces(map) {
	MarkLeaves();
	RecursiveWorldNode(re.world.nodes[0], 15);
	/*var faces = re.world.faces;
	for (var i = 0; i < faces.length; i++) {
		AddWorldSurface(faces[i]);
	}*/
}

	return {
		Init: Init,
		Shutdown: Shutdown,
		LoadMap: LoadMap,
		RenderScene: RenderScene,
		AddRefEntityToScene: AddRefEntityToScene,
		CreateElement: CreateElement,
		DeleteElement: DeleteElement,
		DrawText: DrawText
	};
});
