define('clipmap/cm',
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
	// keep 1/8 unit away to keep the position valid before network snapping
// and to avoid various numeric issues
var SURFACE_CLIP_EPSILON = 0.125;

var ClipMapLocals = function () {
	this.shaders     = null;
	this.brushes     = null;
	this.models      = null;
	this.leafs       = null;
	this.leafBrushes = null;
	this.nodes       = null;
	this.planes      = null;
	this.shaders     = null;
	this.entities    = null;
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
	this.leaf = null;                            // submodels don't reference the main tree
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
	this.shaderNum = 0;                          // the shader that determined the contents
	this.contents  = 0;
	this.bounds    = [[0, 0, 0], [0, 0, 0]];
	this.numsides  = 0;
	this.sides     = null;
	this.checkcount = 0;                         // to avoid repeated testings
};

/**********************************************************
 * Tracing
 **********************************************************/
var TraceResults = function () {
	this.allSolid   = false;                     // if true, plane is not valid
	this.startSolid = false;                     // if true, the initial point was in a solid area
	this.fraction   = 1.0;                       // time completed, 1.0 = didn't hit anything
	this.endPos     = vec3.create();             // final position
	this.plane      = null;                      // surface normal at impact, transformed to world space
};

var MAX_POSITION_LEAFS = 1024;

var LeafList = function () {
	this.list  = new Uint32Array(MAX_POSITION_LEAFS);
	this.count = 0;
};

var TraceWork = function () {
	this.trace     = new TraceResults();
	this.start     = vec3.create();
	this.end       = vec3.create();
	this.size      = [                           // size of the box being swept through the model
		vec3.create(),
		vec3.create()
	];
	this.offsets   = [                           // [signbits][x] = either size[0][x] or size[1][x]
		vec3.create(),
		vec3.create(),
		vec3.create(),
		vec3.create(),
		vec3.create(),
		vec3.create(),
		vec3.create(),
		vec3.create()
	];
	this.maxOffset = 0;                          // longest corner length from origin
	this.extents   = vec3.create();              // greatest of abs(size[0]) and abs(size[1])
	this.bounds    = [                           // enclosing box of start and end surrounding by size
		vec3.create(),
		vec3.create()
	];
	this.contents  = 0;                          // ored contents of the model tracing through
	this.isPoint   = false;                      // optimized case
};

	// We don't want everyone who requires us to 
	// have the same version of clipmap.
	function ClipMap(cominterface) {
		var com = cominterface;
		var cm;

function LoadMap(mapName, callback) {
	console.log('--------- CM Init ---------');
	console.log('Loading clipmap for ' + mapName);

	cm = new ClipMapLocals();

	com.ReadFile('../' + Q3W_BASE_FOLDER + '/maps/' + mapName + '.bsp', 'binary', function (data) {
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

		LoadShaders(data, header.lumps[Lumps.SHADERS]);
		LoadLeafs(data, header.lumps[Lumps.LEAFS]);
		LoadLeafBrushes(data, header.lumps[Lumps.LEAFBRUSHES]);
		LoadPlanes(data, header.lumps[Lumps.PLANES]);
		LoadBrushSides(data, header.lumps[Lumps.BRUSHSIDES]);
		LoadBrushes(data, header.lumps[Lumps.BRUSHES]);
		LoadSubmodels(data, header.lumps[Lumps.MODELS]);
		LoadNodes(data, header.lumps[Lumps.NODES]);
		LoadEntities(data, header.lumps[Lumps.ENTITIES]);

		if (callback) {
			callback();
		}
	});
}

function LoadShaders(buffer, shaderLump) {
	var bb = new ByteBuffer(buffer, ByteBuffer.LITTLE_ENDIAN);
	bb.index = shaderLump.fileofs;

	var shaders = cm.shaders = new Array(shaderLump.filelen / dshader_t.size);

	for (var i = 0; i < shaders.length; i++) {
		var shader = shaders[i] = new dshader_t();

		shader.shaderName = bb.readUTFChars(MAX_QPATH);
		shader.flags = bb.readInt();
		shader.contents = bb.readInt();
	}
}

function LoadLeafs(buffer, leafLump) {
	var bb = new ByteBuffer(buffer, ByteBuffer.LITTLE_ENDIAN);
	bb.index = leafLump.fileofs;

	var leafs = cm.leafs = new Array(leafLump.filelen / dleaf_t.size);

	for (var i = 0; i < leafs.length; i++) {
		var leaf = leafs[i] = new cleaf_t();

		leaf.cluster = bb.readInt();
		leaf.area = bb.readInt();
		
		// Skip mins/maxs.
		bb.index += 24;

		leaf.firstLeafSurface = bb.readInt();
		leaf.numLeafSurfaces = bb.readInt();
		leaf.firstLeafBrush = bb.readInt();
		leaf.numLeafBrushes = bb.readInt();
	}

}

function LoadLeafBrushes(buffer, leafBrushLump) {
	var bb = new ByteBuffer(buffer, ByteBuffer.LITTLE_ENDIAN);
	bb.index = leafBrushLump.fileofs;

	var leafBrushes = cm.leafBrushes = new Array(leafBrushLump.filelen / 4);

	for (var i = 0; i < leafBrushes.length; i++) {
		leafBrushes[i] = bb.readInt();
	}
}

function LoadPlanes(buffer, planeLump) {
	var bb = new ByteBuffer(buffer, ByteBuffer.LITTLE_ENDIAN);
	bb.index = planeLump.fileofs;

	var planes = cm.planes = new Array(planeLump.filelen / dplane_t.size);

	for (var i = 0; i < planes.length; i++) {
		var plane = planes[i] = new Plane();

		plane.normal = [bb.readFloat(), bb.readFloat(), bb.readFloat()]
		plane.dist = bb.readFloat();
		plane.signbits = GetPlaneSignbits(plane);
		plane.type = PlaneTypeForNormal(plane.normal);
	}
}

function LoadBrushSides(buffer, brushSideLump) {
	var planes = cm.planes;

	var bb = new ByteBuffer(buffer, ByteBuffer.LITTLE_ENDIAN);
	bb.index = brushSideLump.fileofs;

	var brushSides = cm.brushSides = new Array(brushSideLump.filelen / dbrushside_t.size);

	for (var i = 0; i < brushSides.length; i++) {
		var side = brushSides[i] = new cbrushside_t();

		var planeNum = bb.readInt();
		var shaderNum = bb.readInt();

		side.plane = planes[planeNum];
		side.shaderNum = shaderNum;
		side.surfaceFlags = cm.shaders[shaderNum].surfaceFlags;
	}
}

function LoadBrushes(buffer, brushLump) {
	var shaders = cm.shaders;
	var brushSides = cm.brushSides;

	var bb = new ByteBuffer(buffer, ByteBuffer.LITTLE_ENDIAN);
	bb.index = brushLump.fileofs;

	var brushes = cm.brushes = new Array(brushLump.filelen / dbrush_t.size);

	for (var i = 0; i < brushes.length; i++) {
		var brush = brushes[i] = new cbrush_t();

		brush.side = bb.readInt();
		brush.numsides = bb.readInt();
		brush.shaderNum = bb.readInt();
		brush.sides = brushSides.slice(brush.side, brush.side + brush.numsides);
		brush.bounds = [
			[-brush.sides[0].plane.dist, -brush.sides[2].plane.dist, -brush.sides[4].plane.dist],
			[brush.sides[1].plane.dist, brush.sides[3].plane.dist, brush.sides[5].plane.dist]
		];
		brush.contents = shaders[brush.shaderNum].contents;
	}
}

function LoadSubmodels(buffer, modelLump) {
	var bb = new ByteBuffer(buffer, ByteBuffer.LITTLE_ENDIAN);
	bb.index = modelLump.fileofs;

	var models = cm.models = new Array(modelLump.filelen / dmodel_t.size);

	for (var i = 0; i < models.length; i++) {
		var model = models[i] = new cmodel_t();

		// Spread the mins / maxs by a pixel.
		model.mins = [bb.readFloat() - 1, bb.readFloat() - 1, bb.readFloat() - 1];
		model.maxs = [bb.readFloat() + 1, bb.readFloat() + 1, bb.readFloat() + 1];

		var firstSurface = bb.readInt();
		var numSurfaces = bb.readInt();
		var firstBrush = bb.readInt();
		var numBrushes = bb.readInt();

		if (i === 0) {
			continue;	// world model doesn't need other info
		}

		// make a "leaf" just to hold the model's brushes and surfaces
		/*out->leaf.numLeafBrushes = LittleLong( in->numBrushes );
		indexes = Hunk_Alloc( out->leaf.numLeafBrushes * 4, h_high );
		out->leaf.firstLeafBrush = indexes - cm.leafbrushes;
		for ( j = 0 ; j < out->leaf.numLeafBrushes ; j++ ) {
			indexes[j] = LittleLong( in->firstBrush ) + j;
		}

		out->leaf.numLeafSurfaces = LittleLong( in->numSurfaces );
		indexes = Hunk_Alloc( out->leaf.numLeafSurfaces * 4, h_high );
		out->leaf.firstLeafSurface = indexes - cm.leafsurfaces;
		for ( j = 0 ; j < out->leaf.numLeafSurfaces ; j++ ) {
			indexes[j] = LittleLong( in->firstSurface ) + j;
		}*/
	}
}

function LoadNodes(buffer, nodeLump) {
	var planes = cm.planes;

	var bb = new ByteBuffer(buffer, ByteBuffer.LITTLE_ENDIAN);
	bb.index = nodeLump.fileofs;

	var nodes = cm.nodes = new Array(nodeLump.filelen / dnode_t.size);

	for (var i = 0; i < nodes.length; i++) {
		var node = nodes[i] = new cnode_t();

		node.planeNum = bb.readInt();
		node.childrenNum = [bb.readInt(), bb.readInt()];

		// Skip mins/maxs.
		bb.index += 24;
	}
}

function LoadEntities(buffer, entityLump) {
	var bb = new ByteBuffer(buffer, ByteBuffer.LITTLE_ENDIAN);
	bb.index = entityLump.fileofs;

	var entityStr = bb.readString(entityLump.filelen);

	var entities = cm.entities = [];

	entityStr.replace(/\{([^}]*)\}/mg, function($0, entitySrc) {
		var entity = {
			classname: 'unknown'
		};

		entitySrc.replace(/"(.+)" "(.+)"$/mg, function($0, key, value) {

			switch (key) {
				case 'origin':
				case 'origin2':
					value.replace(/(.+) (.+) (.+)/, function($0, x, y, z) {
						entity[key] = [
							parseFloat(x),
							parseFloat(y),
							parseFloat(z)
						];
					});
					break;
				case 'angle':
					entity[key] = parseFloat(value);
					break;
				default:
					entity[key] = value;
					break;
			}
		});
		
		entities.push(entity);
	});
}

function ClipHandleToModel(handle) {
	if (handle < 0) {
		throw new Error('ClipHandleToModel: bad handle ' + handle);
	}
	if (handle < cm.models.length) {
		return cm.models[handle];
	}
	/*if ( handle == BOX_MODEL_HANDLE ) {
		return &box_model;
	}*/
	
	throw new Error('ClipHandleToModel: bad handle ' + cm.models.length + ' < ' + handle);
}

function InlineModel(num) {
	if (num < 0 || num >= cm.models.length) {
		throw new Error('GetInlineModel: bad number');
	}

	return num;
}

function ModelBounds(model, mins, maxs) {
	var cmod = ClipHandleToModel( model );
	vec3.set(cmod.mins, mins);
	vec3.set(cmod.maxs, maxs);
}
		/*********************************************************************
 *
 * LEAF LISTING
 *
 ********************************************************************/

/**
 * BoxLeafnums
 * Fills in a list of all the leafs touched
 */
function BoxLeafnums_r(ll, mins, maxs, nodenum) {
	while (1) {
		if (nodenum < 0) {
			if (ll.count >= MAX_POSITION_LEAFS) {
				return;
			}
			ll.list[ll.count++] = -1 - nodenum;
			return;
		}
	
		var node = cm.nodes[nodenum];
		var s = BoxOnPlaneSide(mins, maxs, cm.planes[node.planeNum]);

		if (s === 1) {
			nodenum = node.childrenNum[0];
		} else if (s === 2) {
			nodenum = node.childrenNum[1];
		} else {
			// go down both
			BoxLeafnums_r(ll, mins, maxs, node.childrenNum[0]);
			nodenum = node.childrenNum[1];
		}
	}
}

function BoundsIntersect(mins, maxs, mins2, maxs2) {
	if (maxs[0] < mins2[0] - SURFACE_CLIP_EPSILON ||
		maxs[1] < mins2[1] - SURFACE_CLIP_EPSILON ||
		maxs[2] < mins2[2] - SURFACE_CLIP_EPSILON ||
		mins[0] > maxs2[0] + SURFACE_CLIP_EPSILON ||
		mins[1] > maxs2[1] + SURFACE_CLIP_EPSILON ||
		mins[2] > maxs2[2] + SURFACE_CLIP_EPSILON) {
		return false;
	}

	return true;
}
		/*********************************************************************
 *
 * POSITION TESTING
 *
 ********************************************************************/

function TestBoxInBrush(tw, brush) {
	if (!brush.numsides) {
		return;
	}

	// Special test for axial.
	if (tw.bounds[0][0] > brush.bounds[1][0]
		|| tw.bounds[0][1] > brush.bounds[1][1]
		|| tw.bounds[0][2] > brush.bounds[1][2]
		|| tw.bounds[1][0] < brush.bounds[0][0]
		|| tw.bounds[1][1] < brush.bounds[0][1]
		|| tw.bounds[1][2] < brush.bounds[0][2]) {
		return;
	}

	// The first six planes are the axial planes, so we only
	// need to test the remainder.
	for (var i = 6; i < brush.numsides; i++) {
		var side = brush.sides + i;
		var plane = side.plane;

		// adjust the plane distance apropriately for mins/maxs
		var dist = plane.dist - vec3.dot(tw.offsets[plane.signbits], plane.normal);
		var d1 = vec3.dot(tw.start, plane.normal) - dist;

		// if completely in front of face, no intersection
		if (d1 > 0) {
			return;
		}
	}

	// Inside this brush.
	tw.trace.startSolid = tw.trace.allSolid = true;
	tw.trace.fraction = 0;
	tw.trace.contents = brush.contents;
}

function TestInLeaf(tw, leaf) {
	var brushes = cm.brushes;
	var leafBrushes = cm.leafBrushes;

	// test box position against all brushes in the leaf
	for (var k = 0; k < leaf.numLeafBrushes; k++) {
		var brushnum = leafBrushes[leaf.firstLeafBrush+k];
		var b = brushes[brushnum];

		if (b.checkcount === cm.checkcount) {
			continue; // already checked this brush in another leaf
		}
		b.checkcount = cm.checkcount;

		if (!(b.contents & tw.contents)) {
			continue;
		}
		
		TestBoxInBrush(tw, b);
		if (tw.trace.allSolid) {
			return;
		}
	}

	/*// test against all patches
	if ( !cm_noCurves->integer ) {
		for ( k = 0 ; k < leaf->numLeafSurfaces ; k++ ) {
			patch = cm.surfaces[ cm.leafsurfaces[ leaf->firstLeafSurface + k ] ];
			if ( !patch ) {
				continue;
			}
			if ( patch->checkcount == cm.checkcount ) {
				continue;	// already checked this brush in another leaf
			}
			patch->checkcount = cm.checkcount;

			if ( !(patch->contents & tw->contents)) {
				continue;
			}
			
			if ( CM_PositionTestInPatchCollide( tw, patch->pc ) ) {
				tw->trace.startsolid = tw->trace.allsolid = qtrue;
				tw->trace.fraction = 0;
				tw->trace.contents = patch->contents;
				return;
			}
		}
	}*/
}

// Don't allocate this each time.
var leaflist = new LeafList();
function PositionTest(tw) {
	var leafs = cm.leafs;
	var mins = vec3.add(tw.start, tw.size[0], [0, 0, 0]);
	var maxs = vec3.add(tw.start, tw.size[1], [0, 0, 0]);

	vec3.add(mins, [-1, -1, -1]);
	vec3.add(maxs, [1, 1, 1]);

	cm.checkcount++;
	leaflist.count = 0;
	BoxLeafnums_r(leaflist, mins, maxs, 0);
	cm.checkcount++;

	// test the contents of the leafs
	for (var i = 0; i < leaflist.count; i++) {
		TestInLeaf(tw, leafs[leaflist.list[i]]);

		if (tw.trace.allSolid) {
			break;
		}
	}
}

/*********************************************************************
 *
 * TRACING
 *
 ********************************************************************/
function TraceThroughTree(tw, num, p1f, p2f, p1, p2) {
	var brushes = cm.brushes;
	var leafs = cm.leafs;
	var leafBrushes = cm.leafBrushes;
	var nodes = cm.nodes;
	var planes = cm.planes;
	var shaders = cm.shaders;

	if (tw.trace.fraction <= p1f) {
		return; // already hit something nearer
	}

	if (num < 0) { // Leaf node?
		TraceThroughLeaf(tw, leafs[-(num + 1)]);
		return;
	}

	//
	// find the point distances to the seperating plane
	// and the offset for the size of the box
	//
	var node = nodes[num];
	var plane = planes[node.planeNum];

	// adjust the plane distance apropriately for mins/maxs
	var t1, t2, offset;

	if (plane.type < 3) {
		t1 = p1[plane.type] - plane.dist;
		t2 = p2[plane.type] - plane.dist;
		offset = tw.extents[plane.type];
	} else {
		t1 = vec3.dot(plane.normal, p1) - plane.dist;
		t2 = vec3.dot(plane.normal, p2) - plane.dist;
		if (tw.isPoint) {
			offset = 0;
		} else {
			// this is silly
			offset = 2048;
		}
	}

	// see which sides we need to consider
	if (t1 >= offset + 1 && t2 >= offset + 1) {
		TraceThroughTree(tw, node.childrenNum[0], p1f, p2f, p1, p2);
		return;
	}
	if (t1 < -offset - 1 && t2 < -offset - 1) {
		TraceThroughTree(tw, node.childrenNum[1], p1f, p2f, p1, p2);
		return;
	}

	// put the crosspoint SURFACE_CLIP_EPSILON pixels on the near side
	var idist, side, frac, frac2;

	if (t1 < t2) {
		idist = 1.0/(t1-t2);
		side = 1;
		frac2 = (t1 + offset + SURFACE_CLIP_EPSILON)*idist;
		frac = (t1 - offset + SURFACE_CLIP_EPSILON)*idist;
	} else if (t1 > t2) {
		idist = 1.0/(t1-t2);
		side = 0;
		frac2 = (t1 - offset - SURFACE_CLIP_EPSILON)*idist;
		frac = (t1 + offset + SURFACE_CLIP_EPSILON)*idist;
	} else {
		side = 0;
		frac = 1;
		frac2 = 0;
	}

	// move up to the node
	var mid = [0, 0, 0], midf;

	if (frac < 0) {
		frac = 0;
	} else if (frac > 1) {
		frac = 1;
	}
		
	midf = p1f + (p2f - p1f)*frac;
	mid[0] = p1[0] + frac*(p2[0] - p1[0]);
	mid[1] = p1[1] + frac*(p2[1] - p1[1]);
	mid[2] = p1[2] + frac*(p2[2] - p1[2]);

	TraceThroughTree(tw, node.childrenNum[side], p1f, midf, p1, mid);

	// go past the node
	if (frac2 < 0) {
		frac2 = 0;
	}
	if (frac2 > 1) {
		frac2 = 1;
	}
		
	midf = p1f + (p2f - p1f)*frac2;
	mid[0] = p1[0] + frac2*(p2[0] - p1[0]);
	mid[1] = p1[1] + frac2*(p2[1] - p1[1]);
	mid[2] = p1[2] + frac2*(p2[2] - p1[2]);

	TraceThroughTree(tw, node.childrenNum[side^1], midf, p2f, mid, p2);
}

function TraceThroughLeaf(tw, leaf) {
	var brushes = cm.brushes;
	var leafBrushes = cm.leafBrushes;
	var shaders = cm.shaders;

	// trace line against all brushes in the leaf
	for (var i = 0; i < leaf.numLeafBrushes; i++) {
		var brushNum = leafBrushes[leaf.firstLeafBrush + i];
		var brush = brushes[brushNum];

		if (brush.checkcount === cm.checkcount) {
			continue;	// already checked this brush in another leaf
		}

		brush.checkcount = cm.checkcount;

		// TODO Support this
		if ( !(brush.contents & tw.contents) ) {
			continue;
		}

		if (!BoundsIntersect(tw.bounds[0], tw.bounds[1], brush.bounds[0], brush.bounds[1])) {
			continue;
		}

		TraceThroughBrush(tw, brush);

		if (!tw.trace.fraction) {
			return;
		}
	}
}

function TraceThroughBrush(tw, brush) {
	var brushSides = cm.brushSides;
	var trace = tw.trace;
	var leadside;
	var clipplane;
	var getout = false;
	var startout = false;
	var enterFrac = -1.0;
	var leaveFrac = 1.0;

	if (!brush.numsides) {
		return;
	}

	//
	// compare the trace against all planes of the brush
	// find the latest time the trace crosses a plane towards the interior
	// and the earliest time the trace crosses a plane towards the exterior
	//
	for (var i = 0; i < brush.numsides; i++) {
		var side = brush.sides[i];
		var plane = side.plane;

		// adjust the plane distance apropriately for mins/maxs
		var dist = plane.dist - vec3.dot(tw.offsets[plane.signbits], plane.normal);
		var d1 = vec3.dot(tw.start, plane.normal) - dist;
		var d2 = vec3.dot(tw.end, plane.normal) - dist;

		if (d2 > 0) {
			getout = true; // endpoint is not in solid
		}
		if (d1 > 0) {
			startout = true;
		}

		// if completely in front of face, no intersection with the entire brush
		if (d1 > 0 && (d2 >= SURFACE_CLIP_EPSILON || d2 >= d1)) {
			return;
		}

		// if it doesn't cross the plane, the plane isn't relevent
		if (d1 <= 0 && d2 <= 0) {
			continue;
		}

		// crosses face
		if (d1 > d2) {	// enter
			var f = (d1-SURFACE_CLIP_EPSILON) / (d1-d2);
			if (f < 0) {
				f = 0;
			}
			if (f > enterFrac) {
				enterFrac = f;
				clipplane = plane;
				leadside = side;
			}
		} else {	// leave
			var f = (d1+SURFACE_CLIP_EPSILON) / (d1-d2);
			if (f > 1) {
				f = 1;
			}
			if (f < leaveFrac) {
				leaveFrac = f;
			}
		}
	}

	//
	// all planes have been checked, and the trace was not
	// completely outside the brush
	//
	if (!startout) {	// original point was inside brush
		tw.trace.startSolid = true;
		if (!getout) {
			tw.trace.allSolid = true;
			tw.trace.fraction = 0;
			tw.trace.contents = brush.contents;
		}
		return;
	}
	
	if (enterFrac < leaveFrac) {
		if (enterFrac > -1 && enterFrac < tw.trace.fraction) {
			if (enterFrac < 0) {
				enterFrac = 0;
			}
			tw.trace.fraction = enterFrac;
			tw.trace.plane = clipplane;
			// TODO
			//tw.trace.surfaceFlags = leadside.surfaceFlags;
			tw.trace.contents = brush.contents;
		}
	}
}

function Trace(start, end, mins, maxs, brushmask, tw) {
	tw = tw || new TraceWork();
	var trace = tw.trace;

	if (!cm.checkcount) cm.checkcount = 0;
	cm.checkcount++; // for multi-check avoidance

	// set basic parms
	tw.contents = brushmask;

	// adjust so that mins and maxs are always symetric, which
	// avoids some complications with plane expanding of rotated
	// bmodels
	var offset = [0, 0, 0];
	for (var i = 0 ; i < 3 ; i++) {
		offset[i] = (mins[i] + maxs[i]) * 0.5;
		tw.size[0][i] = mins[i] - offset[i];
		tw.size[1][i] = maxs[i] - offset[i];
		tw.start[i] = start[i] + offset[i];
		tw.end[i] = end[i] + offset[i];
	}

	tw.maxOffset = tw.size[1][0] + tw.size[1][1] + tw.size[1][2];

	// tw.offsets[signbits] = vector to apropriate corner from origin
	tw.offsets[0][0] = tw.size[0][0];
	tw.offsets[0][1] = tw.size[0][1];
	tw.offsets[0][2] = tw.size[0][2];

	tw.offsets[1][0] = tw.size[1][0];
	tw.offsets[1][1] = tw.size[0][1];
	tw.offsets[1][2] = tw.size[0][2];

	tw.offsets[2][0] = tw.size[0][0];
	tw.offsets[2][1] = tw.size[1][1];
	tw.offsets[2][2] = tw.size[0][2];

	tw.offsets[3][0] = tw.size[1][0];
	tw.offsets[3][1] = tw.size[1][1];
	tw.offsets[3][2] = tw.size[0][2];

	tw.offsets[4][0] = tw.size[0][0];
	tw.offsets[4][1] = tw.size[0][1];
	tw.offsets[4][2] = tw.size[1][2];

	tw.offsets[5][0] = tw.size[1][0];
	tw.offsets[5][1] = tw.size[0][1];
	tw.offsets[5][2] = tw.size[1][2];

	tw.offsets[6][0] = tw.size[0][0];
	tw.offsets[6][1] = tw.size[1][1];
	tw.offsets[6][2] = tw.size[1][2];

	tw.offsets[7][0] = tw.size[1][0];
	tw.offsets[7][1] = tw.size[1][1];
	tw.offsets[7][2] = tw.size[1][2];

	//
	// calculate bounds
	//
	for (var i = 0 ; i < 3 ; i++) {
		if (tw.start[i] < tw.end[i]) {
			tw.bounds[0][i] = tw.start[i] + tw.size[0][i];
			tw.bounds[1][i] = tw.end[i] + tw.size[1][i];
		} else {
			tw.bounds[0][i] = tw.end[i] + tw.size[0][i];
			tw.bounds[1][i] = tw.start[i] + tw.size[1][i];
		}
	}

	//
	// check for position test special case
	//
	if (start[0] == end[0] && start[1] == end[1] && start[2] == end[2]) {
		PositionTest(tw);
	} else {
		//
		// check for point special case
		//
		if (tw.size[0][0] == 0 && tw.size[0][1] == 0 && tw.size[0][2] == 0) {
			tw.isPoint = true;
			tw.extents = [0, 0, 0];
		} else {
			tw.isPoint = false;
			tw.extents[0] = tw.size[1][0];
			tw.extents[1] = tw.size[1][1];
			tw.extents[2] = tw.size[1][2];
		}

		TraceThroughTree(tw, 0, 0, 1, tw.start, tw.end);
	}

	// generate endpos from the original, unmodified start/end
	for (var i = 0; i < 3; i++) {
		tw.trace.endPos[i] = start[i] + tw.trace.fraction * (end[i] - start[i]);
	}
	
	return trace;
}

		return {
			LoadMap: LoadMap,
			EntityDefs: function () { return cm.entities; },
			InlineModel: InlineModel,
			ModelBounds: ModelBounds,
			Trace: Trace
		};
	};

	return {
		CreateInstance: function (cominterface) {
			return new ClipMap(cominterface);
		}
	};
});
