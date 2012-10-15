define('client/cl',
['underscore', 'glmatrix', 'ByteBuffer', 'cgame/cg', 'clipmap/cm', 'renderer/re'],
function (_, glmatrix, ByteBuffer, cg, clipmap, re) {	
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
	/**********************************************************
 * Definitions common between client and server, but not
 * game or render modules.
 **********************************************************/

var MAX_MAP_AREA_BYTES = 32;                     // bit vector of area visibility

// Event types for the main message pump.
var EventTypes = {
	NETCLMESSAGE:    0,
	NETSVCONNECT:    1,
	NETSVDISCONNECT: 2,
	NETSVMESSAGE:    3,
	KEYDOWN:         4,
	KEYUP:           5,
	MOUSEMOVE:       6
};

/**********************************************************
 * Networking
 **********************************************************/
var PACKET_BACKUP         = 32;                  // number of old messages that must be kept on client and
                                                 // server for delta comrpession and ping estimation
var MAX_PACKET_USERCMDS   = 32;                  // max number of usercmd_t in a packet
var MAX_RELIABLE_COMMANDS = 64;                  // max string commands buffered for restransmit
var MAX_MSGLEN            = 16384;

var NetChan = function () {
	this.src              = 0;
	this.remoteAddress    = null;
	this.socket           = null;
	this.incomingSequence = 0;
	this.outgoingSequence = 0;
};

var ClientMessage = {
	nop:           0,
	move:          1,                            // [[UserCmd]
	moveNoDelta:   2,                            // [[UserCmd]
	clientCommand: 3,                            // [string] message
	EOF:           4
};

var ServerMessage = {
	gamestate:      0,
	configstring:   1,                           // [short] [string] only in gamestate messages
	baseline:       2,                           // only in gamestate messages
	serverCommand:  3,                           // [string] to be executed by client game module
	snapshot:       4
};
	var CMD_BACKUP = 64;
var CMD_MASK   = (CMD_BACKUP - 1);

var ClientGame = function () {
	this.initialized          = false;
	this.frameInterpolation   = 0;               // (float)( cg.time - cg.frame->serverTime ) / (cg.nextFrame->serverTime - cg.frame->serverTime)

	this.thisFrameTeleport    = false;
	this.nextFrameTeleport    = false;
	this.time                 = 0;               // this is the time value that the client is rendering at.
	//this.oldTime              = 0;               // time at last frame, used for missile trails and prediction checking
	this.physicsTime          = 0;               // either cg.snap->time or cg.nextSnap->time
	this.latestSnapshotNum    = 0;               // the number of snapshots the client system has received
	this.latestSnapshotTime   = 0;               // the time from latestSnapshotNum, so we don't need to read the snapshot yet
	this.snap                 = null;            // cg.snap->serverTime <= cg.time
	this.nextSnap             = null;            // cg.nextSnap->serverTime > cg.time, or NULL
	this.entities             = new Array(MAX_GENTITIES);
	// prediction state
	this.hyperspace           = false;           // true if prediction has hit a trigger_teleport
	this.validPPS             = false;
	this.predictedErrorTime   = 0;
	this.predictedError       = vec3.create();
	this.predictedPlayerState = null;
	this.refdef               = new RefDef();

	for (var i = 0; i < MAX_GENTITIES; i++) {
		this.entities[i] = new ClientGameEntity();
	}
};

var ClientGameStatic = function () {
	this.gameState            = null;
	this.processedSnapshotNum = 0;               // the number of snapshots cgame has requested
};

// ClientGameEntity have a direct corespondence with GameEntity in the game, but
// only the EntityState is directly communicated to the cgame.
var ClientGameEntity =  function () {
	this.currentState = new EntityState();       // from cg.frame
	this.nextState    = new EntityState();       // from cg.nextFrame, if available
	this.interpolate  = false;                   // true if next is valid to interpolate to
	this.currentValid = false;                   // true if cg.frame holds this entity

	/*
	int				muzzleFlashTime;	// move to playerEntity?
	int				previousEvent;
	int				teleportFlag;

	int				trailTime;		// so missile trails can handle dropped initial packets
	int				dustTrailTime;
	int				miscTime;
	*/

	this.snapShotTime = 0;                    // last time this entity was found in a snapshot

	/*
	playerEntity_t	pe;

	int				errorTime;		// decay the error from this time
	vec3_t			errorOrigin;
	vec3_t			errorAngles;
	*/
	
	this.extrapolated = false;                   // false if origin / angles is an interpolation
	this.rawOrigin    = [0, 0, 0];
	this.rawAngles    = [0, 0, 0];

	// exact interpolated position of entity on this frame
	this.lerpOrigin = [0, 0, 0];
	this.lerpAngles = [0, 0, 0];
};
	// The parseEntities array must be large enough to hold PACKET_BACKUP frames of
// entities, so that when a delta compressed message arives from the server
// it can be un-deltad from the original.
var MAX_PARSE_ENTITIES = 2048;

var ClientLocals = function () {
	this.snap                 = null;                      // latest received from server
	this.serverTime           = 0;                         // may be paused during play
	this.oldServerTime        = 0;                         // to prevent time from flowing bakcwards
	this.oldFrameServerTime   = 0;                         // to check tournament restarts
	this.serverTimeDelta      = 0;                         // cl.serverTime = cls.realtime + cl.serverTimeDelta
	                                                       // this value changes as net lag varies

	this.extrapolatedSnapshot = false;                     // set if any cgame frame has been forced to extrapolate
	                                                       // cleared when CL_AdjustTimeDelta looks at it
	this.newSnapshots         = false;                     // set on parse of any valid packet
	this.gameState            = [];                        // configstrings
	this.mouseX               = 0;
	this.mouseY               = 0;
	this.viewangles           = [0, 0, 0];

	// cmds[cmdNumber] is the predicted command,
	// [cmdNumber-1] is the last properly generated
	// command.
	this.cmds                 = new Array(CMD_BACKUP);     // each mesage will send several old cmds
	this.cmdNumber            = 0;                         // incremented each frame, because multiple
	                                                       // frames may need to be packed into a single packet

	this.snapshots            = new Array(PACKET_BACKUP);
	this.entityBaselines      = new Array(MAX_GENTITIES);  // for delta compression when not in previous frame
	this.parseEntities        = new Array(MAX_PARSE_ENTITIES);
	this.parseEntitiesNum     = 0;                         // index (not anded off) into cl_parse_entities[]
	
	for (var i = 0; i < PACKET_BACKUP; i++) {
		this.snapshots[i] = new ClientSnapshot();
	}

	for (var i = 0; i < CMD_BACKUP; i++) {
		this.cmds[i] = new UserCmd();
	}

	for (var i = 0; i < MAX_PARSE_ENTITIES; i++) {
		this.parseEntities[i] = new EntityState();
	}
};

var ClientStatic = function () {
	this.initialized     = false;
	this.realTime        = 0;
};

var ConnectionState = {
	UNINITIALIZED: 0,
	DISCONNECTED:  1,                                      // not talking to a server
	CONNECTING:    2,                                      // sending request packets to the server
	CHALLENGING:   3,                                      // sending challenge packets to the server
	CONNECTED:     4,                                      // netchan_t established, getting gamestate
	LOADING:       5,                                      // only during cgame initialization, never during main loop
	PRIMED:        6,                                      // got gamestate, waiting for first frame
	ACTIVE:        7                                       // game views should be displayed
};

var ClientConnection = function () {
	this.state                     = ConnectionState.UNINITIALIZED;
	this.clientNum                 = -1;
	this.lastPacketSentTime        = 0;                    // for retransmits during connection
	this.lastPacketTime            = 0;                    // for timeouts

	// These are our reliable messages that go to the
	// server.
	this.reliableSequence          = 0;
	this.reliableAcknowledge       = 0;                    // the last one the server has executed
	this.reliableCommands          = new Array(MAX_RELIABLE_COMMANDS);

	// Message sequence is used by both the network layer
	// and the delta compression layer.
	this.serverMessageSequence     = 0;
	// Reliable messages received from server.
	this.serverCommandSequence     = 0;
	this.lastExecutedServerCommand = 0;                    // last server command grabbed or executed with CL_GetServerCommand
	this.serverCommands            = new Array(MAX_RELIABLE_COMMANDS);

	this.netchan                   = null;
};

var ClientSnapshot = function () {
	this.valid            = false;                         // cleared if delta parsing was invalid
	this.snapFlags        = 0;                             // rate delayed and dropped commands
	this.serverTime       = 0;                             // server time the message is valid for (in msec)
	this.messageNum       = 0;                             // copied from netchan->incoming_sequence
	this.deltaNum         = 0;                             // messageNum the delta is from
	this.ping             = 0;                             // time from when cmdNum-1 was sent to time packet was reeceived
	this.areamask         = new Array(MAX_MAP_AREA_BYTES); // portalarea visibility bits
	this.cmdNum           = 0;                             // the next cmdNum the server is expecting
	this.ps               = new PlayerState();             // complete information about the current player at this time
	this.numEntities      = 0;                             // all of the entities that need to be presented
	this.parseEntitiesNum = 0;                             // at the time of this snapshot
	this.serverCommandNum = 0;                             // execute all commands up to this before
	                                                       // making the snapshot current
};

var KeyState = function () {
	this.active   = false,
	this.downtime = 0;
	this.partial  = 0;
	this.binding  = null;
};
	var com;

var cl;
var clc;
var cls = new ClientStatic();
var cm;
var cl_sensitivity;
var cl_showTimeDelta;
var commands = {};
var keys = {};

function Init(cominterface) {
	console.log('--------- CL Init ---------');

	com = cominterface;

	ClearState();
	clc = new ClientConnection();
	cm = clipmap.CreateInstance({ ReadFile: com.ReadFile });
	
	cls.realtime = 0;

	cl_sensitivity = com.AddCvar('cl_sensitivity', 2);
	cl_showTimeDelta = com.AddCvar('cl_showTimeDelta', 0);

	InitInput();
	InitCmd();
	InitRenderer();

	cls.initialized = true;

	setTimeout(function () {
		//ConnectCmd('192.168.0.102:9001');
		ConnectCmd('localhost:9000');
	}, 100);
}

function ClearState() {
	console.log('Clearing client state');

	cl = new ClientLocals();
}

function InitCGame() {
	var cginterface = {
		AddCmd:                      com.AddCmd,
		AddCvar:                     com.AddCvar,
		GetMilliseconds:             com.GetMilliseconds,
		GetGameState:                function () { return cl.gameState; },
		GetCurrentUserCommandNumber: GetCurrentUserCommandNumber,
		GetUserCommand:              GetUserCommand,
		GetCurrentSnapshotNumber:    GetCurrentSnapshotNumber,
		GetSnapshot:                 GetSnapshot,
		LoadClipMap:                 cm.LoadMap,
		Trace:                       cm.Trace,
		LoadRenderMap:               re.LoadMap,
		AddRefEntityToScene:         re.AddRefEntityToScene,
		CreateElement:               re.CreateElement,
		DeleteElement:               re.DeleteElement,
		DrawText:                    re.DrawText,
		RenderScene:                 re.RenderScene
	};

	clc.state = ConnectionState.LOADING;
	cg.Init(cginterface, clc.serverMessageSequence);
	// We will send a usercmd this frame, which will cause
	// the server to send us the first snapshot.
	clc.state = ConnectionState.PRIMED;
}

function ShutdownCGame() {
	cg.Shutdown();
}

function InitRenderer() {
	var reinterface = {
		AddCmd:                      com.AddCmd,
		AddCvar:                     com.AddCvar,
		GetMilliseconds:             com.GetMilliseconds,
		ReadFile:                    com.ReadFile,
		GetGameRenderContext:        com.GetGameRenderContext,
		GetUIRenderContext:          com.GetUIRenderContext
	};

	re.Init(reinterface);
}

function ShutdownRenderer() {
	re.Shutdown();
}

function Frame(frameTime, msec) {
	cls.frameTime = frameTime;

	if (!cls.initialized) {
		return;
	}

	cls.frameDelta = msec;
	cls.realTime += cls.frameDelta;

	SendCommand();

	// Decide on the serverTime to render.
	SetCGameTime();

	UpdateScreen();
}

function UpdateScreen() {
	switch (clc.state) {
		case ConnectionState.DISCONNECTED:
		case ConnectionState.CONNECTING:
		case ConnectionState.CHALLENGING:
		case ConnectionState.CONNECTED:
		case ConnectionState.LOADING:
		case ConnectionState.PRIMED:
			break;
		case ConnectionState.ACTIVE:
			cg.Frame(cl.serverTime);
			break;
	}
}

function MapLoading() {
	if (clc.state >= ConnectionState.CONNECTED /*&& !Q_stricmp( clc.servername, "localhost" ) */) {
		clc.state = ConnectionState.CONNECTED;		// so the connect screen is drawn
		/*Com_Memset( cls.updateInfoString, 0, sizeof( cls.updateInfoString ) );
		Com_Memset( clc.serverMessage, 0, sizeof( clc.serverMessage ) );
		Com_Memset( &cl.gameState, 0, sizeof( cl.gameState ) );
		clc.lastPacketSentTime = -9999;
		SCR_UpdateScreen();*/
	} else {
		/*// clear nextmap so the cinematic shutdown doesn't execute it
		Cvar_Set( "nextmap", "" );
		CL_Disconnect( qtrue );
		Q_strncpyz( clc.servername, "localhost", sizeof(clc.servername) );*/
		clc.state = ConnectionState.CHALLENGING;		// so the connect screen is drawn
		/*Key_SetCatcher( 0 );
		SCR_UpdateScreen();
		clc.connectTime = -RETRANSMIT_TIMEOUT;
		NET_StringToAdr( clc.servername, &clc.serverAddress, UNSPEC);
		// we don't need a challenge on the localhost
		CL_CheckForResend();*/
	}
}

function Disconnect(showMainMenu) {
	/*if (!com_cl_running || !com_cl_running->integer) {
		return;
	}

	if (uivm && showMainMenu) {
		VM_Call( uivm, UI_SET_ACTIVE_MENU, UIMENU_NONE );
	}*/

	// Send a disconnect message to the server.
	// Send it a few times in case one is dropped.
	if (clc.state >= ConnectionState.CONNECTED) {
		AddReliableCommand('disconnect');
		WritePacket();
		// We're on TCP/IP doesn't matter.
		//WritePacket();
		//WritePacket();
	}
	
	ClearState ();

	// Wipe the client connection.
	clc = new ClientConnection();
	clc.state = ConnectionState.DISCONNECTED;
}


/**
 * AddReliableCommand
 *
 * The given command will be transmitted to the server, and is gauranteed to
 * not have future usercmd_t executed before it is executed
*/
function AddReliableCommand(cmd/*, isDisconnectCmd*/) {
	/*int unacknowledged = clc.reliableSequence - clc.reliableAcknowledge;
	
	// If we would be losing an old command that hasn't been acknowledged,
	// we must drop the connection, also leave one slot open for the
	// disconnect command in this case.
	if ((isDisconnectCmd && unacknowledged > MAX_RELIABLE_COMMANDS) ||
	    (!isDisconnectCmd && unacknowledged >= MAX_RELIABLE_COMMANDS))
	{
		if (com_errorEntered) {
			return;
		} else {
			throw new Error('Client command overflow');
		}
	}*/
	clc.reliableCommands[++clc.reliableSequence % MAX_RELIABLE_COMMANDS] = cmd;
}


function PacketEvent(addr, buffer) {
	if (!cls.initialized) {
		return;
	}

	var msg = new ByteBuffer(buffer, ByteBuffer.LITTLE_ENDIAN);

	// Peek in and see if this is a string message.
	if (buffer.byteLength > 4 && msg.view.getInt32(0, !!ByteBuffer.LITTLE_ENDIAN) === -1) {
		ParseStringMessage(addr, msg);
		return;
	}

	if (!com.NetchanProcess(clc.netchan, msg)) {
		return;
	}

	// Track the last message received so it can be returned in 
	// client messages, allowing the server to detect a dropped
	// gamestate.
	clc.serverMessageSequence = clc.netchan.incomingSequence;

	ParseServerMessage(msg);
}

function ParseStringMessage(addr, msg) {
	msg.readInt();  // Skip the -1.

	var str = msg.readCString();

	if (str === 'connectResponse') {
		if (clc.state >= ConnectionState.CONNECTED) {
			console.warn('Dup connect received. Ignored.');
			return;
		}
		if (clc.state != ConnectionState.CHALLENGING) {
			console.warn('connectResponse packet while not connecting. Ignored.');
			return;
		}
		/*if ( !NET_CompareAdr( from, clc.serverAddress ) ) {
			Com_Printf( "connectResponse from wrong address. Ignored.\n" );
			return;
		}*/

		// TODO Setup netchan here, make cl-cmd.js just send the connect request.
		//Netchan_Setup(NS_CLIENT, &clc.netchan, from, Cvar_VariableValue("net_qport"), clc.challenge, qfalse);

		console.log('Got connection response');
		
		clc.state = ConnectionState.CONNECTED;
		clc.lastPacketSentTime = -9999;  // send first packet immediately
	}
}
	function GetCurrentUserCommandNumber() {
	return cl.cmdNumber;
}

function GetUserCommand(cmdNumber) {
	// cmds[cmdNumber] is the last properly generated command.

	// Can't return anything that we haven't created yet.
	if (cmdNumber > cl.cmdNumber) {
		throw new Error('GetUserCommandd: ' + cmdNumber + ' >= ' + cl.cmdNumber);
	}

	// the usercmd has been overwritten in the wrapping
	// buffer because it is too far out of date
	if (cmdNumber <= cl.cmdNumber - CMD_BACKUP) {
		return null;
	}

	return cl.cmds[cmdNumber & CMD_MASK];
}

/**
 * AdjustTimeDelta
 *
 * Adjust the clients view of server time.
 *
 * We attempt to have cl.serverTime exactly equal the server's view
 * of time plus the timeNudge, but with variable latencies over
 * the internet it will often need to drift a bit to match conditions.

 * Our ideal time would be to have the adjusted time approach, but not pass,
 * the very latest snapshot.

 * Adjustments are only made when a new snapshot arrives with a rational
 * latency, which keeps the adjustment process framerate independent and
 * prevents massive overadjustment during times of significant packet loss
 * or bursted delayed packets.
 */
var RESET_TIME = 500;

function AdjustTimeDelta() {
	cl.newSnapshots = false;

	var newDelta = cl.snap.serverTime - cls.realTime;
	var deltaDelta = Math.abs(newDelta - cl.serverTimeDelta);

	if (deltaDelta > RESET_TIME) {
		cl.serverTimeDelta = newDelta;
		cl.oldServerTime = cl.snap.serverTime;
		cl.serverTime = cl.snap.serverTime;
		if (cl_showTimeDelta()) {
			console.log('AdjustTimeDelta: <RESET>');
		}
	} else if (deltaDelta > 100) {
		// fast adjust, cut the difference in half
		cl.serverTimeDelta = (cl.serverTimeDelta + newDelta) >> 1;
		if (cl_showTimeDelta()) {
			console.log('AdjustTimeDelta: <FAST>');
		}
	} else {
		// slow drift adjust, only move 1 or 2 msec

		// if any of the frames between this and the previous snapshot
		// had to be extrapolated, nudge our sense of time back a little
		// the granularity of +1 / -2 is too high for timescale modified frametimes
		//if (com_timescale->value == 0 || com_timescale->value == 1) {
			if (cl.extrapolatedSnapshot) {
				cl.extrapolatedSnapshot = false;
				cl.serverTimeDelta -= 2;
			} else {
				// otherwise, move our sense of time forward to minimize total latency
				cl.serverTimeDelta++;
			}
		//}
	}

	if (cl_showTimeDelta()) {
		console.log('AdjustTimeDelta: ' + cl.serverTimeDelta);
	}
}

function SetCGameTime() {
	// Getting a valid frame message ends the connection process.
	if (clc.state !== ConnectionState.ACTIVE) {
		if (clc.state !== ConnectionState.PRIMED) {
			return;
		}

		if (cl.newSnapshots) {
			cl.newSnapshots = false;
			FirstSnapshot();
		}
		
		if (clc.state !== ConnectionState.ACTIVE) {
			return;
		}
	}

	// If we have gotten to this point, cl.snap is guaranteed to be valid.
	if (!cl.snap.valid) {
		throw new Error('SetCGameTime: !cl.snap.valid');
	}

	if (cl.snap.serverTime < cl.oldFrameServerTime) {
		throw new Error('cl.snap.serverTime < cl.oldFrameServerTime');
	}
	cl.oldFrameServerTime = cl.snap.serverTime;

	// Get our current view of time.
	cl.serverTime = cls.realTime + cl.serverTimeDelta;

	// Guarantee that time will never flow backwards, even if
	// serverTimeDelta made an adjustment.
	if (cl.serverTime < cl.oldServerTime) {
		cl.serverTime = cl.oldServerTime;
	}
	cl.oldServerTime = cl.serverTime;

	// If we are almost past the latest frame (without timeNudge), we will
	// try and adjust back a bit when the next snapshot arrives.
	if ( cls.realTime + cl.serverTimeDelta >= cl.snap.serverTime - 5 ) {
		cl.extrapolatedSnapshot = true;
	}

	// If we have gotten new snapshots, drift serverTimeDelta.
	// Don't do this every frame, or a period of packet loss would
	// make a huge adjustment.
	if (cl.newSnapshots) {
		AdjustTimeDelta();
	}
}

function FirstSnapshot() {
	// Ignore snapshots that don't have entities.
	if (cl.snap.snapFlags & SNAPFLAG_NOT_ACTIVE) {
		return;
	}

	clc.state = ConnectionState.ACTIVE;

	// Set the timedelta so we are exactly on this first frame.
	cl.serverTimeDelta = cl.snap.serverTime - cls.realTime;
	cl.oldServerTime = cl.snap.serverTime;
}

function GetCurrentSnapshotNumber() {
	return {
		snapshotNumber: cl.snap.messageNum,
		serverTime: cl.snap.serverTime
	};
}

function GetSnapshot(snapshotNumber) {
	if (snapshotNumber > cl.snap.messageNum) {
		throw new Error('GetSnapshot: snapshotNumber > cl.snapshot.messageNum');
	}

	// If the frame has fallen out of the circular buffer, we can't return it.
	if (cl.snap.messageNum - snapshotNumber >= PACKET_BACKUP) {
		return null;
	}

	// If the frame is not valid, we can't return it.
	var snap = cl.snapshots[snapshotNumber % PACKET_BACKUP];
	if (!snap.valid) {
		return null;
	}

	// If the entities in the frame have fallen out of their circular buffer, we can't return it.
	if (cl.parseEntitiesNum - snap.parseEntitiesNum >= MAX_PARSE_ENTITIES) {
		return null;
	}
	
	// TODO: Should split up cgame and client snapshot structures, adding this property to the
	// cgame version.
	snap.entities = new Array(snap.numEntities);

	for (var i = 0; i < snap.numEntities; i++) {
		snap.entities[i] = cl.parseEntities[(snap.parseEntitiesNum + i) & (MAX_PARSE_ENTITIES-1)];
	}

	return snap;
}
	function InitCmd() {
	com.AddCmd('connect', ConnectCmd);
}

function ConnectCmd(serverName) {
	var parts = serverName.split(':');
	var host = parts[0];
	var port = parts[1];

	Disconnect(false);

	/*Q_strncpyz( clc.servername, server, sizeof(clc.servername) );

	if (!NET_StringToAdr(clc.servername, &clc.serverAddress, family) ) {
		Com_Printf ("Bad server address\n");
		clc.state = CA_DISCONNECTED;
		return;
	}
	if (clc.serverAddress.port == 0) {
		clc.serverAddress.port = BigShort( PORT_SERVER );
	}

	serverString = NET_AdrToStringwPort(clc.serverAddress);

	Com_Printf( "%s resolved to %s\n", clc.servername, serverString);*/

	var addr = StringToAddr('ws://' + host + ':' + port);
	clc.netchan = com.NetchanSetup(NetSrc.CLIENT, addr);
	clc.state = ConnectionState.CHALLENGING;

	/*clc.connectTime = -99999;	// CL_CheckForResend() will fire immediately
	clc.connectPacketCount = 0;*/
}

function StringToAddr(str) {
	var addr = new NetAdr();

	if (str.indexOf('localhost') !== -1) {
		addr.type = NetAdrType.LOOPBACK;
	} else {
		addr.type = NetAdrType.IP;
	}

	// TODO: Add a default port support.
	var ip = str;
	var m = ip.match(/\/\/(.+)\:(\d+)/);
	if (m) {
		addr.ip = m[1];
		addr.port = m[2];
	}

	return addr;
}

	var activeKeys = {};
var forwardKey, leftKey, backKey, rightKey, upKey;

function InitInput() {
	com.AddCmd('+forward', function (key) { forwardKey = key; });
	com.AddCmd('+left', function (key) { leftKey = key; });
	com.AddCmd('+back', function (key) { backKey = key; });
	com.AddCmd('+right', function (key) { rightKey = key; });
	com.AddCmd('+jump', function (key) { upKey = key; });

	Bind('w', '+forward');
	Bind('a', '+left');
	Bind('s', '+back');
	Bind('d', '+right');
	Bind('space', '+jump');
}

/**
 * Process current input variables into userCommand_t
 * struct for transmission to server.
 */

function SendCommand() {
	// Don't send any message if not connected.
	if (clc.state < ConnectionState.CONNECTED) {
		return;
	}

	CreateNewCommands();
	WritePacket();
}

function CreateNewCommands() {
	// No need to create usercmds until we have a gamestate.
	if (clc.state < ConnectionState.PRIMED) {
		return;
	}

	cl.cmdNumber++;
	cl.cmds[cl.cmdNumber & CMD_MASK] = CreateCommand();
}

function CreateCommand() {
	var cmd = new UserCmd();

	KeyMove(cmd);
	MouseMove(cmd);

	// Send the current server time so the amount of movement
	// can be determined without allowing cheating.
	cmd.serverTime = cl.serverTime;

	return cmd;
}

/**
 * WritePacket
 *
 * Create and send the command packet to the server,
 * including both the reliable commands and the usercmds.
 * 
 * During normal gameplay, a client packet will contain
 * something like:
 *
 * 4    serverid
 * 4    sequence number
 * 4    acknowledged sequence number
 * <optional reliable commands>
 * 1    clc_move or clc_moveNoDelta
 * 1    command count
 * <count * usercmds>
 */
function WritePacket() {
	var msg = new ByteBuffer(MAX_MSGLEN, ByteBuffer.LITTLE_ENDIAN);
	var serverid = parseInt(cl.gameState['sv_serverid']);

	msg.writeInt(serverid);
	// Write the last message we received, which can
	// be used for delta compression, and is also used
	// to tell if we dropped a gamestate
	msg.writeInt(clc.serverMessageSequence);
	// Write the last reliable message we received.
	msg.writeInt(clc.serverCommandSequence);

	// Write any unacknowledged client commands.
	for (var i = clc.reliableAcknowledge + 1; i <= clc.reliableSequence; i++) {
		msg.writeUnsignedByte(ClientMessage.clientCommand);
		msg.writeInt(i);
		msg.writeCString(clc.reliableCommands[i % MAX_RELIABLE_COMMANDS]);
	}

	// Write only the latest client command for now
	// since we're rocking TCP.
	var cmd = cl.cmds[cl.cmdNumber & CMD_MASK];

	msg.writeUnsignedByte(ClientMessage.moveNoDelta);
	msg.writeUnsignedInt(cmd.serverTime);
	msg.writeFloat(cmd.angles[0]);
	msg.writeFloat(cmd.angles[1]);
	msg.writeFloat(cmd.angles[2]);
	msg.writeByte(cmd.forwardmove);
	msg.writeByte(cmd.rightmove);
	msg.writeByte(cmd.upmove);

	com.NetchanSend(clc.netchan, msg.buffer, msg.index);

	if (!window.foobar) {
		console.log('SENDING SHIT TO SERVER', clc.netchan);
		window.foobar = true;
	}
}

function KeyMove(cmd) {
	var movespeed = 127;
	var forward = 0, side = 0, up = 0;

	if (forwardKey) forward += movespeed * GetKeyState(forwardKey);
	if (backKey) forward -= movespeed * GetKeyState(backKey);

	if (rightKey) side += movespeed * GetKeyState(rightKey);
	if (leftKey) side -= movespeed * GetKeyState(leftKey);

	if (upKey) { var foobar = GetKeyState(upKey); up += movespeed * foobar; }
	//if (upKey) up -= movespeed * GetKeyState(upKey);

	cmd.forwardmove = ClampChar(forward);
	cmd.rightmove = ClampChar(side);
	cmd.upmove = up;
}

function MouseMove(cmd) {
	var oldAngles = cl.viewangles;
	var mx = cl.mouseX * cl_sensitivity();
	var my = cl.mouseY * cl_sensitivity();

	cl.viewangles[YAW] -= mx * 0.022;
	cl.viewangles[PITCH] += my * 0.022;

	if (cl.viewangles[PITCH] - oldAngles[PITCH] > 90) {
		cl.viewangles[PITCH] = oldAngles[PITCH] + 90;
	} else if (oldAngles[PITCH] - cl.viewangles[PITCH] > 90) {
		cl.viewangles[PITCH] = oldAngles[PITCH] - 90;
	}

	// reset
	cl.mouseX = 0;
	cl.mouseY = 0;

	cmd.angles[0] = cl.viewangles[0];
	cmd.angles[1] = cl.viewangles[1];
	cmd.angles[2] = cl.viewangles[2];
}

/**
 * Key helpers
 */
function GetKey(keyName) {
	return keys[keyName] || (keys[keyName] = new KeyState());
}

/**
 * Abstracted key/mouse event handling.
 */
function KeyDownEvent(time, keyName) {
	var key = GetKey(keyName);

	// Some browsers repeat keydown events, we don't want that.
	if (key.active) return;

	key.active = true;
	key.downtime = time;
	ExecBinding(key);
}

function KeyUpEvent(time, keyName) {
	var key = GetKey(keyName);
	key.active = false;
	// Partial frame summing.
	key.partial += time - key.downtime;
	ExecBinding(key);
}

function MouseMoveEvent(time, dx, dy) {
	cl.mouseX += dx;
	cl.mouseY += dy;
}

/**
 * Returns the fraction of the frame the input was down.
 */
function GetKeyState(key) {
	var msec = key.partial;
	key.partial = 0;

	if (key.active) {
		msec += cls.frameTime - key.downtime;
	}

	key.downtime = cls.frameTime;

	var val = msec / cls.frameDelta;
	if (val < 0) val = 0;
	if (val > 1) val = 1;
	return val;
}

/**
 * Key bindings
 */
function ExecBinding(key) {
	var cmdToExec = key.binding;

	if (!cmdToExec) return;
	if (!key.active && cmdToExec.charAt(0) === '+') cmdToExec = '-' + cmdToExec.substr(1);

	var callback = com.GetCmd(cmdToExec);
	if (callback) callback.call(this, key);
}

function Bind(keyName, cmd) {
	var key = GetKey(keyName);
	key.binding = cmd;
}

function Unbind(keyName, cmd) {
	delete key.binding;
}
	function ParseServerMessage(msg) {
	// Get the reliable sequence acknowledge number.
	clc.reliableAcknowledge = msg.readInt();
	if (clc.reliableAcknowledge < clc.reliableSequence - MAX_RELIABLE_COMMANDS) {
		clc.reliableAcknowledge = clc.reliableSequence;
	}

	var type = msg.readUnsignedByte();

	if (type === ServerMessage.gamestate) {
		ParseGameState(msg);
	} else if (type === ServerMessage.snapshot) {
		ParseSnapshot(msg);
	}
}

function ParseGameState(msg) {
	// Wipe local client state.
	ClearState();

	// TODO make this read in an array of configstrings
	var key = msg.readCString();
	var val = msg.readCString();
	cl.gameState[key] = val;

	key = msg.readCString();
	val = msg.readCString();
	cl.gameState[key] = val;

	console.log('Received gamestate', cl.gameState['sv_mapname'], cl.gameState['sv_serverid']);

	// Let the client game init and load data.
	InitCGame();
}

function ParseSnapshot(msg) {
	var newSnap = new ClientSnapshot();

	// We will have read any new server commands in this
	// message before we got to svc_snapshot.
	newSnap.messageNum = clc.serverMessageSequence;
	newSnap.serverCommandNum = clc.serverCommandSequence;

	// TODO should be replaced by the code below
	newSnap.serverTime = msg.readUnsignedInt();
	newSnap.snapFlags = msg.readUnsignedInt();
	newSnap.valid = true;

	/*newSnap.serverTime = snapshot.serverTime;
	newSnap.deltaNum = !snapshot.deltaNum ? -1 : newSnap.messageNum - snapshot.deltaNum;
	newSnap.snapFlags = MSG_ReadByte( msg );

	// If the frame is delta compressed from data that we
	// no longer have available, we must suck up the rest of
	// the frame, but not use it, then ask for a non-compressed
	// message 
	var old;

	if (newSnap.deltaNum <= 0) {
		newSnap.valid = true;		// uncompressed frame
	} else {
		old = cl.snapshots[newSnap.deltaNum % PACKET_BACKUP];
		if (!old.valid) {
			// should never happen
			throw new Error('Delta from invalid frame (not supposed to happen!).');
		} else if (old.messageNum != newSnap.deltaNum) {
			// The frame that the server did the delta from
			// is too old, so we can't reconstruct it properly.
			throw new Error('Delta frame too old.');
		} else if (cl.parseEntitiesNum - old.parseEntitiesNum > MAX_PARSE_ENTITIES-128) {
			throw new Error('Delta parseEntitiesNum too old.');
		} else {
			newSnap.valid = true;	// valid delta parse
		}
	}

	// read areamask
	newSnap.areamask = snapshot.areamask;*/

	// read playerinfo
	/*if (old) {
		MSG_ReadDeltaPlayerstate( msg, &old->ps, &newSnap.ps );
	} else {
		MSG_ReadDeltaPlayerstate( msg, NULL, &newSnap.ps );
	}*/
	ParsePacketPlayerstate(msg, newSnap);

	// read packet entities
	ParsePacketEntities(msg,/* old, */newSnap);

	// if not valid, dump the entire thing now that it has
	// been properly read
	/*if (!newSnap.valid) {
		return;
	}*/

	// clear the valid flags of any snapshots between the last
	// received and this one, so if there was a dropped packet
	// it won't look like something valid to delta from next
	// time we wrap around in the buffer
	/*var oldMessageNum = cl.snap.messageNum + 1;

	if (newSnap.messageNum - oldMessageNum >= PACKET_BACKUP) {
		oldMessageNum = newSnap.messageNum - ( PACKET_BACKUP - 1 );
	}
	for ( ; oldMessageNum < newSnap.messageNum ; oldMessageNum++ ) {
		cl.snapshots[oldMessageNum % PACKET_BACKUP].valid = false;
	}*/
	
	// copy to the current good spot
	cl.snap = newSnap;

	/*cl.snap.ping = 999;
	// calculate ping time
	for (var i = 0 ; i < PACKET_BACKUP ; i++ ) {
		packetNum = (clc.netchan.outgoingSequence - 1 - i) % PACKET_BACKUP;
		if (cl.snap.ps.commandTime >= cl.outPackets[packetNum].p_serverTime) {
			cl.snap.ping = cls.realtime - cl.outPackets[packetNum].p_realtime;
			break;
		}
	}*/

	// save the frame off in the backup array for later delta comparisons
	cl.snapshots[cl.snap.messageNum % PACKET_BACKUP] = cl.snap;

	cl.newSnapshots = true;
}

function ParsePacketPlayerstate(msg, snap) {
	snap.ps.clientNum = msg.readInt();
	snap.ps.commandTime = msg.readInt();
	snap.ps.pm_type = msg.readInt();
	snap.ps.pm_flags = msg.readInt();
	snap.ps.pm_time = msg.readInt();
	snap.ps.gravity = msg.readInt();
	snap.ps.speed = msg.readInt();
	snap.ps.origin[0] = msg.readFloat();
	snap.ps.origin[1] = msg.readFloat();
	snap.ps.origin[2] = msg.readFloat();
	snap.ps.velocity[0] = msg.readFloat();
	snap.ps.velocity[1] = msg.readFloat();
	snap.ps.velocity[2] = msg.readFloat();
	snap.ps.viewangles[0] = msg.readFloat();
	snap.ps.viewangles[1] = msg.readFloat();
	snap.ps.viewangles[2] = msg.readFloat();
}

function ParsePacketEntities(msg, snap) {	
	snap.parseEntitiesNum = cl.parseEntitiesNum;

	while (true) {
		var newnum = msg.readInt();

		if (newnum === (MAX_GENTITIES-1)) {
			break;
		}

		// Save the parsed entity state into the big circular buffer so
		// it can be used as the source for a later delta.
		var state = cl.parseEntities[cl.parseEntitiesNum & (MAX_PARSE_ENTITIES-1)];

		state.number = newnum;
		state.eType = msg.readInt();
		state.eFlags = msg.readInt();

		state.pos.trType = msg.readInt();
		state.pos.trTime = msg.readInt();
		state.pos.trDuration = msg.readInt();
		state.pos.trBase[0] = msg.readFloat();
		state.pos.trBase[1] = msg.readFloat();
		state.pos.trBase[2] = msg.readFloat();
		state.pos.trDelta[0] = msg.readFloat();
		state.pos.trDelta[1] = msg.readFloat();
		state.pos.trDelta[2] = msg.readFloat();

		state.apos.trType = msg.readInt();
		state.apos.trTime = msg.readInt();
		state.apos.trDuration = msg.readInt();
		state.apos.trBase[0] = msg.readFloat();
		state.apos.trBase[1] = msg.readFloat();
		state.apos.trBase[2] = msg.readFloat();
		state.apos.trDelta[0] = msg.readFloat();
		state.apos.trDelta[1] = msg.readFloat();
		state.apos.trDelta[2] = msg.readFloat();

		state.origin[0] = msg.readFloat();
		state.origin[1] = msg.readFloat();
		state.origin[2] = msg.readFloat();
		/*state.origin2[0] = msg.readFloat();
		state.origin2[1] = msg.readFloat();
		state.origin2[2] = msg.readFloat();
		state.angles[0] = msg.readFloat();
		state.angles[1] = msg.readFloat();
		state.angles[2] = msg.readFloat();
		state.angles2[0] = msg.readFloat();
		state.angles2[1] = msg.readFloat();
		state.angles2[2] = msg.readFloat();
		state.groundEntityNum = msg.readInt();
		state.clientNum = msg.readInt();*/
		/*state.frame = state.frame;
		state.solid = state.solid;
		state.event = state.event;
		state.eventParm = state.eventParm;*/

		cl.parseEntitiesNum++;
		snap.numEntities++;
	}
}

	return {
		Init:             Init,
		InitCGame:        InitCGame,
		ShutdownCGame:    ShutdownCGame,
		InitRenderer:     InitRenderer,
		ShutdownRenderer: ShutdownRenderer,
		Frame:            Frame,
		PacketEvent:      PacketEvent,
		KeyDownEvent:     KeyDownEvent,
		KeyUpEvent:       KeyUpEvent,
		MouseMoveEvent:   MouseMoveEvent,
		MapLoading:       MapLoading
	};
});
