define('server/sv',
['underscore', 'ByteBuffer', 'game/gm', 'client/cl', 'clipmap/cm'],
function (_, ByteBuffer, gm, cl, clipmap) {
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
	var FRAMETIME = 100; // msec

// The server does not know how to interpret most of the values
// in entityStates (level eType), so the game must explicitly flag
// special server behaviors.
var ServerFlags = {
	NOCLIENT:           0x00000001,              // don't send entity to clients, even if it has effects
	BOT:                0x00000002,              // set if the entity is a bot
	BROADCAST:          0x00000008,              // send to all connected clients
	PORTAL:             0x00000020,              // merge a second pvs at origin2 into snapshots
	USE_CURRENT_ORIGIN: 0x00000040,              // entity->r.currentOrigin instead of entity->s.origin
	                                             // for link position (missiles and movers)
	SINGLECLIENT:       0x00000080,              // only send to a single client (entityShared_t->singleClient)
	NOTSINGLECLIENT:    0x00000100               // send entity to everyone but one client
};

var GameEntity = function () {
	/**
	 * Shared by the engine and game.
	 */
	this.s             = new EntityState();
	this.linked        = false;
	// SVF_NOCLIENT, SVF_BROADCAST, etc.
	this.svFlags       = 0;
	// Only send to this client when SVF_SINGLECLIENT is set.
	this.singleClient  = 0;
	// If false, assume an explicit mins / maxs bounding box only set by trap_SetBrushModel.
	this.bmodel        = false;
	this.mins          = [0, 0, 0];
	this.maxs          = [0, 0, 0];
	// ContentTypes.TRIGGER, ContentTypes.SOLID, ContentTypes.BODY (non-solid ent should be 0)
	this.contents      = 0;
	// Derived from mins/maxs and origin + rotation.
	this.absmin        = [0, 0, 0];
	this.absmax        = [0, 0, 0];
	// currentOrigin will be used for all collision detection and world linking.
	// it will not necessarily be the same as the trajectory evaluation for the current
	// time, because each entity must be moved one at a time after time is advanced
	// to avoid simultanious collision issues.
	this.currentOrigin = [0, 0, 0];
	this.currentAngles = [0, 0, 0];
	this.client        = null;

	/**
	 * Game only
	 */
	this.classname     = 'noclass';
	this.spawnflags    = 0;
	this.model         = null;
	this.model2        = null;
	this.target        = null;
	this.targetname    = null;
	this.nextthink     = 0;
};

var GameClient = function () {
	this.ps = new PlayerState();
};

var LevelLocals = function () {
	this.framenum     = 0;
	this.previousTime = 0;
	this.time         = 0;
	this.clients      = new Array(MAX_CLIENTS);
	this.gentities    = new Array(MAX_GENTITIES);
};
	var MAX_SNAPSHOT_ENTITIES = MAX_CLIENTS * PACKET_BACKUP * 64;

// Persistent across all maps.
var ServerStatic = function () {
	this.initialized          = false;
	this.time                 = 0;
	this.snapFlagServerBit    = 0;                         // ^= SNAPFLAG_SERVERCOUNT every SV_SpawnServer()
	this.clients              = new Array(MAX_CLIENTS);
	this.nextSnapshotEntities = 0;                         // next snapshotEntities to use
	this.snapshotEntities     = new Array(MAX_SNAPSHOT_ENTITIES);
	this.msgBuffer            = new ArrayBuffer(MAX_MSGLEN);

	for (var i = 0; i < MAX_CLIENTS; i++) {
		this.clients[i] = new ServerClient();
	}

	for (var i = 0; i < MAX_SNAPSHOT_ENTITIES; i++) {
		this.snapshotEntities[i] = new EntityState();
	}
};

// Reset for each map.
var ServerLocals = function () {
	this.serverId        = 0;                              // changes each server start
	this.snapshotCounter = 0;                              // incremented for each snapshot built
	this.time            = 0;
	this.timeResidual    = 0;                              // <= 1000 / sv_frame->value
	this.svEntities      = new Array(MAX_GENTITIES);
	this.gameEntities    = null;
	this.gameClients     = null;
};

var ServerEntity = function (number) {
	this.worldSector     = null;
	this.baseline        = new EntityState();
	this.number          = number;
	this.snapshotCounter = 0;
};

var ServerClient = function () {
	this.state                   = ClientState.FREE;

	this.messageAcknowledge      = 0;
	this.reliableCommands        = new Array(MAX_RELIABLE_COMMANDS);
	this.reliableSequence        = 0;                      // last added reliable message, not necesarily sent or acknowledged yet
	this.reliableAcknowledge     = 0;                      // last acknowledged reliable message
	this.reliableSent            = 0;                      // last sent reliable message, not necesarily acknowledged yet

	this.gamestateMessageNum     = -1;

	this.lastMessageNum          = 0;                      // for delta compression
	this.lastClientCommand       = 0;                      // reliable client message sequence
	this.lastClientCommandString = null;

	this.deltaMessage            = -1;                     // frame last client usercmd message
	this.nextReliableTime        = 0;                      // svs.time when another reliable command will be allowed
	this.lastSnapshotTime        = 0;
	this.snapshotMsec            = 0;                      // requests a snapshot every snapshotMsec unless rate choked
	this.frames                  = new Array(PACKET_BACKUP);
	
	this.netchan                 = null;
	this.oldServerTime           = 0;
	
	for (var i = 0; i < PACKET_BACKUP; i++) {
		this.frames[i] = new PlayerState();
	}
};

var ClientSnapshot = function () {
	this.ps          = new PlayerState();
	this.numEntities = 0;
	this.firstEntity  = 0;                                 // index into the circular sv_packet_entities[]
	                                                       // the entities MUST be in increasing state number
	                                                       // order, otherwise the delta compression will fail
};

var ClientState = {
	FREE:      0,                                          // can be reused for a new connection
	ZOMBIE:    1,                                          // client has been disconnected, but don't reuse
	                                                       // connection for a couple seconds
	CONNECTED: 2,                                          // has been assigned to a client_t, but no gamestate yet
	PRIMED:    3,                                          // gamestate has been sent, but client hasn't sent a usercmd
	ACTIVE:    4                                           // client is fully in game
};
	var com;
var dedicated;

var sv;
var svs;
var cm;

var sv_serverid;
var sv_mapname;
var sv_fps;

function Init(cominterface, isdedicated) {
	com = cominterface;
	dedicated = isdedicated;

	sv = new ServerLocals();
	svs = new ServerStatic();
	cm = clipmap.CreateInstance({ ReadFile: com.ReadFile });
	
	sv_serverid = com.AddCvar('sv_serverid', 1337);
	sv_mapname = com.AddCvar('sv_mapname', 'nomap');
	sv_fps = com.AddCvar('sv_fps',     10);

	InitCmd();

	// For dev purposes, simulate command line input.
	setTimeout(function () {
		LoadMapCmd('q3dm17');
	}, 50);
}

function FrameMsec() {
	var fps = sv_fps();
	var frameMsec = 1000 / fps;

	if (frameMsec < 1) {
		frameMsec = 1
	}

	return frameMsec;
}

function Frame(frameTime, msec) {
	svs.frameTime = frameTime;
	
	if (!svs.initialized) {
		return;
	}

	var frameMsec = FrameMsec();
	sv.timeResidual += msec;

	// Run the game simulation in chunks.
	var frames = 0;
	while (sv.timeResidual >= frameMsec) {
		sv.timeResidual -= frameMsec;
		svs.time += frameMsec;
		sv.time += frameMsec;

		// Let everything in the world think and move.
		gm.Frame(sv.time);
		frames++;
	}

	// Don't send out duplicate snapshots if we didn't run any gameframes.
	if (frames > 0) {
		SendClientMessages();
	}
}

function PacketEvent(addr, buffer) {
	if (!svs.initialized) {
		return;
	}

	var msg = new ByteBuffer(buffer, ByteBuffer.LITTLE_ENDIAN);

	for (i = 0; i < svs.clients.length; i++) {
		var client = svs.clients[i];

		if (client.state === ClientState.FREE) {
			continue;
		}

		if (!_.isEqual(client.netchan.addr, addr)) {
			continue;
		}

		if (com.NetchanProcess(client, msg)) {
			ExecuteClientMessage(client, msg);
		}
		return;
	}
}

function SpawnServer(mapName) {
	console.log('--------- SV SpawnServer ---------');
	console.log('Spawning new server for ' + mapName);

	svs.initialized = false;
	
	// Shutdown the game.
	gm.Shutdown();
	
	if (!dedicated) {
		// Update the local client's screen.
		cl.MapLoading();

		// Make sure all the client stuff is unloaded.
		cl.ShutdownCGame();
		cl.ShutdownRenderer();

		// Restart renderer.
		cl.InitRenderer();
	}

	// Toggle the server bit so clients can detect that a server has changed.
	svs.snapFlagServerBit ^= SNAPFLAG_SERVERCOUNT;

	// Wipe the entire per-level structure.
	var oldServerTime = sv.time;
	sv = new ServerLocals();

	// Load the collision map.
	cm.LoadMap(mapName, function () {
		com.SetCvar('sv_mapname', mapName);
		// serverid should be different each time.
		com.SetCvar('sv_serverid', svs.frameTime);

		// Clear physics interaction links.
		ClearWorld();

		// Initialize the game.
		var gminterface = {
			AddCmd:            com.AddCmd,
			AddCvar:           com.AddCvar,
			GetEntityDefs:     cm.EntityDefs,
			LocateGameData:    LocateGameData,
			SetBrushModel:     SetBrushModel,
			LinkEntity:        LinkEntity,
			UnlinkEntity:      UnlinkEntity,
			FindEntitiesInBox: FindEntitiesInBox,
			Trace:             cm.Trace
		};
		gm.Init(gminterface);

		/*// Run a few frames to allow everything to settle.
		for (var i = 0; i < 3; i++) {
			gm.Frame(sv.time);
			sv.time += 100;
			svs.time += 100;
		}*/

		// Send the new gamestate to all connected clients.
		for (var i = 0; i < MAX_CLIENTS; i++) {
			var client = svs.clients[i];

			if (!client || client.state < ClientState.CONNECTED) {
				continue;
			}
			
			// Clear gentity pointer to prevent bad snapshots from building.
			client.gentity = null;

			// When we get the next packet from a connected client,
			// the new gamestate will be sent.
			client.state = ClientState.CONNECTED;
		}	

		/*// Run another frame to allow things to look at all the players.
		gm.Frame(sv.time);
		sv.time += 100;
		svs.time += 100;*/

		svs.initialized = true;
	});
}
	function ClientConnect(addr, socket) {
	console.log('SV: A client is connecting');

	// Find a slot for the client.
	var clientNum;
	for (var i = 0; i < MAX_CLIENTS; i++) {
		if (svs.clients[i].state == ClientState.FREE) {
			clientNum = i;
			break;
		}
	}
	if (clientNum === undefined) {
		throw new Error('Server is full');
	}

	// Create the client.
	var newcl = svs.clients[clientNum];
	newcl.netchan = com.NetchanSetup(NetSrc.SERVER, addr, socket);
	newcl.state = ClientState.CONNECTED;

	UserinfoChanged(newcl);

	// Let the client know we've accepted them.
	com.NetchanPrint(newcl.netchan, 'connectResponse');

	// When we receive the first packet from the client, we will
	// notice that it is from a different serverid and that the
	// gamestate message was not just sent, forcing a retransmit.
	newcl.gamestateMessageNum = -1;
}

/**
 * DropClient
 *
 * Called when the player is totally leaving the server, either willingly
 * or unwillingly.
 */
function DropClient(client, reason) {
	if (client.state === ClientState.ZOMBIE) {
		return;  // already dropped
	}

	/*// see if we already have a challenge for this ip
	challenge = &svs.challenges[0];

	for (i = 0 ; i < MAX_CHALLENGES ; i++, challenge++)
	{
		if(NET_CompareAdr(drop->netchan.remoteAddress, challenge->adr))
		{
			Com_Memset(challenge, 0, sizeof(*challenge));
			break;
		}
	}*/

	// tell everyone why they got dropped
	//SV_SendServerCommand( NULL, "print \"%s" S_COLOR_WHITE " %s\n\"", drop->name, reason );

	// Call the game function for removing a client
	// this will remove the body, among other things.
	var clientNum = svs.clients.indexOf(client);
	gm.ClientDisconnect(clientNum);

	// add the disconnect command
	//SV_SendServerCommand( drop, "disconnect \"%s\"", reason);

	// nuke user info
	//SV_SetUserinfo( drop - svs.clients, "" );
	
	//Com_DPrintf( "Going to CS_ZOMBIE for %s\n", drop->name );
	client.state = ClientState.ZOMBIE;           // become free in a few seconds
}

function ClientEnterWorld(client) {
	var clientNum = svs.clients.indexOf(client);

	client.state = ClientState.ACTIVE;

	gm.ClientBegin(clientNum);

	// The entity is initialized inside of ClientBegin.
	client.gentity = GentityForNum(clientNum);
}

function UserMove(client, msg, delta) {
	var cmd = new UserCmd();

	cmd.serverTime = msg.readUnsignedInt();
	cmd.angles[0] = msg.readFloat();
	cmd.angles[1] = msg.readFloat();
	cmd.angles[2] = msg.readFloat();
	cmd.forwardmove = msg.readByte();
	cmd.rightmove = msg.readByte();
	cmd.upmove = msg.readByte();

	// If this is the first usercmd we have received
	// this gamestate, put the client into the world.
	if (client.state === ClientState.PRIMED) {
		ClientEnterWorld(client);
		// now moves can be processed normaly
	}

	if (client.state !== ClientState.ACTIVE) {
		return; // shouldn't happen
	}

	ClientThink(client, cmd);
}

function ClientThink(client, cmd) {
	var clientNum = GetClientNum(client);
	gm.ClientThink(clientNum, cmd);
}

function SendClientGameState(client) {
	client.state = ClientState.PRIMED;
	// When we receive the first packet from the client, we will
	// notice that it is from a different serverid and that the
	// gamestate message was not just sent, forcing a retransmit.
	client.gamestateMessageNum = client.netchan.outgoingSequence;

	var msg = new ByteBuffer(svs.msgBuffer, ByteBuffer.LITTLE_ENDIAN);

	msg.writeInt(client.lastClientCommand);

	msg.writeUnsignedByte(ServerMessage.gamestate);
	msg.writeCString('sv_mapname');
	msg.writeCString(sv_mapname());
	msg.writeCString('sv_serverid');
	msg.writeCString(sv_serverid().toString());

	com.NetchanSend(client.netchan, msg.buffer, msg.index);
}

function UserinfoChanged(client) {
	var snaps = 20;

	if (snaps < 1) {
		snaps = 1;
	} else if(snaps > sv_fps()) {
		snaps = sv_fps();
	}

	snaps = 1000 / snaps;

	if (snaps != client.snapshotMsec) {
		// Reset last sent snapshot so we avoid desync between server frame time and snapshot send time.
		client.lastSnapshotTime = 0;
		client.snapshotMsec = snaps;
	}
}

function GetClientNum(client) {
	for (var i = 0; i < svs.clients.length; i++) {
		var c = svs.clients[i];

		if (!c) {
			continue;
		}

		if (_.isEqual(c.netchan.addr, client.netchan.addr)) {
			return i;
		}
	}

	return -1;
}

function Disconnect(client) {
	DropClient(client, 'disconnected');
}

/**********************************************************
 *
 * User message/command processing
 *
 **********************************************************/
function ExecuteClientMessage(client, msg) {
	var serverid = msg.readInt();

	client.messageAcknowledge = msg.readInt();
	if (client.messageAcknowledge < 0) {
		// Usually only hackers create messages like this
		// it is more annoying for them to let them hanging.
		return;
	}

	cl.reliableAcknowledge = msg.readInt();
	// NOTE: when the client message is fux0red the acknowledgement numbers
	// can be out of range, this could cause the server to send thousands of server
	// commands which the server thinks are not yet acknowledged in SV_UpdateServerCommandsToClient
	if (client.reliableAcknowledge < client.reliableSequence - MAX_RELIABLE_COMMANDS) {
		// Usually only hackers create messages like this
		// it is more annoying for them to let them hanging.
		client.reliableAcknowledge = client.reliableSequence;
		return;
	}

	// If we can tell that the client has dropped the last
	// gamestate we sent them, resend it.
	if (serverid !== sv_serverid()) {
		if (client.messageAcknowledge > client.gamestateMessageNum) {
			SendClientGameState(client);
		}
		return;
	}

	// This client has acknowledged the new gamestate so it's
	// safe to start sending it the real time again.
	if (client.oldServerTime && serverid === sv_serverid()) {
		client.oldServerTime = 0;
	}

	// Read optional clientCommand strings.
	var type;

	while (true) {
		type = msg.readUnsignedByte();

		if (type === ClientMessage.EOF) {
			break;
		}

		if (type !== ClientMessage.clientCommand) {
			break;
		}

		if (!ClientCommand(client, msg)) {
			return;	// we couldn't execute it because of the flood protection
		}

		if (client.state === ClientState.ZOMBIE) {
			return;	// disconnect command
		}
	}

	// Read the usercmd_t.
	switch (type) {
		case ClientMessage.move:
			UserMove(client, msg, true);
			break;
		case ClientMessage.moveNoDelta:
			UserMove(client, msg, false);
			break;
	}
}


function ClientCommand(client, msg) {
	var sequence = msg.readInt();
	var str = msg.readCString();

	// See if we have already executed it.
	if (client.lastClientCommand >= sequence) {
		return true;
	}

	// drop the connection if we have somehow lost commands
	if (sequence > client.lastClientCommand + 1 ) {
		//Com_Printf( "Client %s lost %i clientCommands\n", cl->name,  seq - cl->lastClientCommand + 1 );
		DropClient(client, 'Lost reliable commands');
		return false;
	}

	// don't allow another command for one second
	client.nextReliableTime = svs.time + 1000;

	ExecuteClientCommand(client, str);

	cl.lastClientCommand = sequence;
	client.lastClientCommandString = str;

	return true; // continue procesing
}

function ExecuteClientCommand(client, str) {
	// see if it is a server level command
	/*for (u=ucmds ; u->name ; u++) {
		if (!strcmp (Cmd_Argv(0), u->name) ) {
			u->func( cl );
			bProcessed = qtrue;
			break;
		}
	}*/
	if (str === 'disconnect') {
		Disconnect(client);
	}

	/*// Pass unknown strings to the game.
	if (!u->name && sv.state == SS_GAME && (cl->state == CS_ACTIVE || cl->state == CS_PRIMED)) {
		Cmd_Args_Sanitize();
		VM_Call( gvm, GAME_CLIENT_COMMAND, cl - svs.clients );
	}*/
}
	function InitCmd() {
	com.AddCmd('map', LoadMapCmd);
	com.AddCmd('sectorlist', SectorListCmd);
}

function LoadMapCmd(mapName) {
	SpawnServer(mapName);
}
	function GentityForNum(num) {
	return sv.gameEntities[num];
}

function SvEntityForGentity(gent) {
	var num = gent.s.number;

	if (!gent || num < 0 || num >= MAX_GENTITIES) {
		throw new Error('SvEntityForSharedEntity: bad game entity');
	}

	var ent = sv.svEntities[num];

	if (!ent) {
		ent = sv.svEntities[num] = new ServerEntity(num);
	}

	return ent;
}

function GentityForSvEntity(ent) {
	var num = ent.number;

	if (!ent || num < 0 || num >= MAX_GENTITIES) {
		throw new Error('SharedEntityForSvEntity: bad sv entity');
	}

	return sv.gameEntities[num];
}

function LocateGameData(gameEntities, gameClients) {
	sv.gameEntities = gameEntities;
	sv.gameClients = gameClients;
}

function SetBrushModel(gent, name) {
	if (!name) {
		throw new Error('SV: SetBrushModel: null');
	}

	if (name.charAt(0) !== '*') {
		throw new Error('SV: SetBrushModel: ' + name + 'isn\'t a brush model');
	}

	gent.s.modelindex = parseInt(name.substr(1));

	var h = cm.InlineModel(gent.s.modelindex);
	cm.ModelBounds(h, gent.mins, gent.maxs);
	gent.bmodel = true;

	// we don't know exactly what is in the brushes
	gent.contents = -1;
}
	/*
=============
BuildClientSnapshot

Decides which entities are going to be visible to the client, and
copies off the playerstate and areabits.
=============
*/
function BuildClientSnapshot(client, msg) {
	var clent = client.gentity;
	if (!clent || client.state === ClientState.ZOMBIE) {
		return false; // Client hasn't entered world yet.
	}

	// Bump the counter used to prevent double adding.
	sv.snapshotCounter++;

	var frame = client.frames[client.netchan.outgoingSequence % PACKET_BACKUP];
	var clientNum = GetClientNum(client);
	frame.ps = gm.GetClientPlayerstate(clientNum);

	var entityNumbers = [];
	AddEntitiesVisibleFromPoint(frame.ps.origin, frame, entityNumbers, false);

	frame.numEntities = 0;
	frame.firstEntity = svs.nextSnapshotEntities;

	// Copy the entity states out.
	for (var i = 0 ; i < entityNumbers.length; i++) {
		var ent = GentityForNum(entityNumbers[i]);
		var state = svs.snapshotEntities[svs.nextSnapshotEntities % MAX_SNAPSHOT_ENTITIES];

		ent.s.clone(state);
		svs.nextSnapshotEntities++;
		frame.numEntities++;
	}

	return true;
}

function AddEntitiesVisibleFromPoint(origin, frame, eNums, portal) {
	/*leafnum = cm.PointLeafnum (origin);
	clientarea = cm.LeafArea (leafnum);
	clientcluster = cm.LeafCluster (leafnum);

	// calculate the visible areas
	frame->areabytes =cm.WriteAreaBits( frame->areabits, clientarea );

	clientpvs = cm.ClusterPVS (clientcluster);*/

	for (var i = 0; i < MAX_GENTITIES; i++) {
		var ent = GentityForNum(i);

		// Never send entities that aren't linked in.
		if (!ent || !ent.linked) {
			continue;
		}

		if (ent.s.number !== i) {
			throw new Error('Entity number does not match.. WTF');
			/*console.log('FIXING ENT->S.NUMBER!!!');
			ent.s.number = e;*/
		}

		// entities can be flagged to explicitly not be sent to the client
		if (ent.svFlags & ServerFlags.NOCLIENT) {
			continue;
		}

		// entities can be flagged to be sent to only one client
		if (ent.svFlags & ServerFlags.SINGLECLIENT) {
			if (ent.singleClient != frame.ps.clientNum) {
				continue;
			}
		}
		// entities can be flagged to be sent to everyone but one client
		if (ent.svFlags & ServerFlags.NOTSINGLECLIENT) {
			if (ent.singleClient === frame.ps.clientNum) {
				continue;
			}
		}

		var svEnt = SvEntityForGentity(ent);

		// don't double add an entity through portals
		if (svEnt.snapshotCounter === sv.snapshotCounter) {
			continue;
		}

		// broadcast entities are always sent
		if (ent.svFlags & ServerFlags.BROADCAST ) {
			AddEntToSnapshot(svEnt, ent, eNums);
			continue;
		}

		/*// ignore if not touching a PV leaf
		// check area
		if ( !CM_AreasConnected( clientarea, svEnt->areanum ) ) {
			// doors can legally straddle two areas, so
			// we may need to check another one
			if ( !CM_AreasConnected( clientarea, svEnt->areanum2 ) ) {
				continue;		// blocked by a door
			}
		}

		bitvector = clientpvs;

		// check individual leafs
		if ( !svEnt->numClusters ) {
			continue;
		}
		l = 0;
		for ( i=0 ; i < svEnt->numClusters ; i++ ) {
			l = svEnt->clusternums[i];
			if ( bitvector[l >> 3] & (1 << (l&7) ) ) {
				break;
			}
		}

		// if we haven't found it to be visible,
		// check overflow clusters that coudln't be stored
		if ( i == svEnt->numClusters ) {
			if ( svEnt->lastCluster ) {
				for ( ; l <= svEnt->lastCluster ; l++ ) {
					if ( bitvector[l >> 3] & (1 << (l&7) ) ) {
						break;
					}
				}
				if ( l == svEnt->lastCluster ) {
					continue;	// not visible
				}
			} else {
				continue;
			}
		}*/

		// add it
		AddEntToSnapshot(svEnt, ent, eNums);

		// if it's a portal entity, add everything visible from its camera position
		/*if (ent.r.svFlags & SVF_PORTAL) {
			if (ent.s.generic1) {
				var dir = vec3.subtract(ent.s.origin, origin, [0, 0, 0]);

				if (VectorLengthSquared(dir) > (float) ent->s.generic1 * ent->s.generic1) {
					continue;
				}
			}
			
			AddEntitiesVisibleFromPoint( ent->s.origin2, frame, eNums, qtrue );
		}*/
	}
}

function AddEntToSnapshot(svEnt, gEnt, eNums) {
	// If we have already added this entity to this snapshot, don't add again.
	if (svEnt.snapshotCounter === sv.snapshotCounter) {
		return;
	}

	svEnt.snapshotCounter = sv.snapshotCounter;

	eNums.push(gEnt.s.number);
}

function SendClientSnapshot(client) {
	if (!BuildClientSnapshot(client)) {
		return;
	}

	var frame = client.frames[client.netchan.outgoingSequence % PACKET_BACKUP];
	var msg = new ByteBuffer(svs.msgBuffer, ByteBuffer.LITTLE_ENDIAN);

	msg.writeInt(client.lastClientCommand);

	msg.writeUnsignedByte(ServerMessage.snapshot);

	// Send over the current server time so the client can drift
	// its view of time to try to match.
	var serverTime = sv.time;
	if (client.oldServerTime) {
		// The server has not yet got an acknowledgement of the
		// new gamestate from this client, so continue to send it
		// a time as if the server has not restarted. Note from
		// the client's perspective this time is strictly speaking
		// incorrect, but since it'll be busy loading a map at
		// the time it doesn't really matter.
		serverTime = sv.time + client.oldServerTime;
	}
	msg.writeInt(serverTime);

	var snapFlags = svs.snapFlagServerBit;
	if (client.state !== ClientState.ACTIVE) {
		snapFlags |= SNAPFLAG_NOT_ACTIVE;
	}
	msg.writeInt(snapFlags);

	// Write out playerstate
	msg.writeInt(frame.ps.clientNum);
	msg.writeInt(frame.ps.commandTime);
	msg.writeInt(frame.ps.pm_type);
	msg.writeInt(frame.ps.pm_flags);
	msg.writeInt(frame.ps.pm_time);
	msg.writeInt(frame.ps.gravity);
	msg.writeInt(frame.ps.speed);

	msg.writeFloat(frame.ps.origin[0]);
	msg.writeFloat(frame.ps.origin[1]);
	msg.writeFloat(frame.ps.origin[2]);

	msg.writeFloat(frame.ps.velocity[0]);
	msg.writeFloat(frame.ps.velocity[1]);
	msg.writeFloat(frame.ps.velocity[2]);

	msg.writeFloat(frame.ps.viewangles[0]);
	msg.writeFloat(frame.ps.viewangles[1]);
	msg.writeFloat(frame.ps.viewangles[2]);

	// Should not write an int, and instead write a bitstream of GENTITYNUM_BITS length.
	for (var i = 0; i < frame.numEntities; i++) {
		var state = svs.snapshotEntities[(frame.firstEntity+i) % MAX_SNAPSHOT_ENTITIES];

		msg.writeInt(state.number);
		msg.writeInt(state.eType);
		msg.writeInt(state.eFlags);

		msg.writeInt(state.pos.trType);
		msg.writeInt(state.pos.trTime);
		msg.writeInt(state.pos.trDuration);
		msg.writeFloat(state.pos.trBase[0]);
		msg.writeFloat(state.pos.trBase[1]);
		msg.writeFloat(state.pos.trBase[2]);
		msg.writeFloat(state.pos.trDelta[0]);
		msg.writeFloat(state.pos.trDelta[1]);
		msg.writeFloat(state.pos.trDelta[2]);

		msg.writeInt(state.apos.trType);
		msg.writeInt(state.apos.trTime);
		msg.writeInt(state.apos.trDuration);
		msg.writeFloat(state.apos.trBase[0]);
		msg.writeFloat(state.apos.trBase[1]);
		msg.writeFloat(state.apos.trBase[2]);
		msg.writeFloat(state.apos.trDelta[0]);
		msg.writeFloat(state.apos.trDelta[1]);
		msg.writeFloat(state.apos.trDelta[2]);

		msg.writeFloat(state.origin[0]);
		msg.writeFloat(state.origin[1]);
		msg.writeFloat(state.origin[2]);
		/*msg.writeFloat(state.origin2[0]);
		msg.writeFloat(state.origin2[1]);
		msg.writeFloat(state.origin2[2]);
		msg.writeFloat(state.angles[0]);
		msg.writeFloat(state.angles[1]);
		msg.writeFloat(state.angles[2]);
		msg.writeFloat(state.angles2[0]);
		msg.writeFloat(state.angles2[1]);
		msg.writeFloat(state.angles2[2]);
		msg.writeUnsignedInt(state.groundEntityNum);
		msg.writeUnsignedInt(state.clientNum);*/
	}

	msg.writeUnsignedInt(MAX_GENTITIES-1);

	com.NetchanSend(client.netchan, msg.buffer, msg.index);
}

function SendClientMessages() {
	for (var i = 0; i < svs.clients.length; i++) {
		var client = svs.clients[i];

		if (!client) {
			continue;
		}
		
		if (!client.state) {
			continue; // not connected
		}

		if (svs.time - client.lastSnapshotTime < client.snapshotMsec) {
			continue; // it's not time yet
		}

		SendClientSnapshot(client);
		client.lastSnapshotTime = svs.time;
	}
}
	/**
 * ENTITY CHECKING
 *
 * To avoid linearly searching through lists of entities during environment testing,
 * the world is carved up with an evenly spaced, axially aligned bsp tree.  Entities
 * are kept in chains either at the final leafs, or at the first node that splits
 * them, which prevents having to deal with multiple fragments of a single entity.
 */

var AREA_DEPTH = 4;
var worldSectors;

var WorldSector = function () {
	this.axis = 0; // -1 = leaf node
	this.dist = 0;
	this.children = [null, null];
	this.entities = {};
};

function SectorListCmd() {	
	for (var i = 0; i < worldSectors.length; i++) {
		var node = worldSectors[i];
		console.log('sector ' + i + ': ' + _.keys(node.entities).length + ' entities');
	}
}

function ClearWorld() {
	worldSectors = [];

	// get world map bounds
	var worldModel = cm.InlineModel(0);
	var mins = [0, 0, 0];
	var maxs = [0, 0, 0];
	cm.ModelBounds(worldModel, mins, maxs);

	CreateWorldSector(0, mins, maxs);
}

/**
 * Builds a uniformly subdivided tree for the given world size
 */
function CreateWorldSector(depth, mins, maxs) {
	var node = worldSectors[worldSectors.length] = new WorldSector();

	if (depth === AREA_DEPTH) {
		node.axis = -1;
		node.children[0] = node.children[1] = null;
		return node;
	}
	
	var size = vec3.subtract(maxs, mins, [0, 0, 0]);
	if (size[0] > size[1]) {
		node.axis = 0;
	} else {
		node.axis = 1;
	}

	var mins1 = vec3.create(mins);
	var mins2 = vec3.create(mins);
	var maxs1 = vec3.create(maxs);
	var maxs2 = vec3.create(maxs);

	node.dist = 0.5 * (maxs[node.axis] + mins[node.axis]);
	maxs1[node.axis] = mins2[node.axis] = node.dist;
	
	node.children[0] = CreateWorldSector(depth+1, mins2, maxs2);
	node.children[1] = CreateWorldSector(depth+1, mins1, maxs1);

	return node;
}

function FindEntitiesInBox(mins, maxs) {
	var entityNums = [];

	var FindEntitiesInBox_r = function (node) {
		for (var num in node.entities) {
			if (!node.entities.hasOwnProperty(num)) {
				continue;
			}

			var ent = node.entities[num];
			var gent = GentityForSvEntity(ent);
			
			if (gent.absmin[0] > maxs[0] ||
				gent.absmin[1] > maxs[1] ||
				gent.absmin[2] > maxs[2] ||
				gent.absmax[0] < mins[0] ||
				gent.absmax[1] < mins[1] ||
				gent.absmax[2] < mins[2]) {
				continue;
			}

			entityNums.push(gent.s.number);
		}
		
		if (node.axis == -1) {
			return; // terminal node
		}

		// recurse down both sides
		if (maxs[node.axis] > node.dist) {
			FindEntitiesInBox_r(node.children[0]);
		}
		if (mins[node.axis] < node.dist ) {
			FindEntitiesInBox_r(node.children[1]);
		}
	};

	FindEntitiesInBox_r(worldSectors[0]);

	return entityNums;
}

// TODO move to com-math
function RadiusFromBounds(mins, maxs) {
	var corner = [0, 0, 0];

	for (var i = 0; i < 3; i++) {
		var a = Math.abs( mins[i] );
		var b = Math.abs( maxs[i] );
		corner[i] = a > b ? a : b;
	}

	return vec3.length(corner);
}

function LinkEntity(gent) {
	var ent = SvEntityForGentity(gent);

	if (ent.worldSector) {
		UnlinkEntity(gent); // unlink from old position
	}

	// encode the size into the entityState_t for client prediction
	/*if (gent.bmodel) {
		gent.s.solid = SOLID_BMODEL; // a solid_box will never create this value
	} else 	if (gent.contents & (ContentTypes.SOLID | ContentTypes.BODY)) {
		// assume that x/y are equal and symetric
		var i = gEnt.maxs[0];
		if (i < 1) {
			i = 1;
		} else if (i > 255) {
			i = 255;
		}

		// z is not symetric
		var j = (-gent.mins[2]);
		if (j < 1) {
			j = 1;
		} else if (j > 255) {
			j = 255;
		}

		// and z maxs can be negative...
		var k = (gent.maxs[2] + 32);
		if (k < 1) {
			k = 1;
		} else if (k > 255) {
			k = 255;
		}

		gent.s.solid = (k << 16) | (j << 8) | i;
	} else {
		gent.s.solid = 0;
	}*/

	// get the position
	var origin = gent.currentOrigin;
	var angles = gent.currentAngles;

	// set the abs box
	/*if (gent.bmodel && (angles[0] || angles[1] || angles[2])) {
		var max = RadiusFromBounds(gent.mins, gent.maxs);
		for (var i = 0; i < 3; i++) {
			gent.absmin[i] = origin[i] - max;
			gent.absmax[i] = origin[i] + max;
		}
	} else {*/
		// normal
		vec3.add(origin, gent.mins, gent.absmin);
		vec3.add(origin, gent.maxs, gent.absmax);
	//}

	// because movement is clipped an epsilon away from an actual edge,
	// we must fully check even when bounding boxes don't quite touch
	gent.absmin[0] -= 1;
	gent.absmin[1] -= 1;
	gent.absmin[2] -= 1;
	gent.absmax[0] += 1;
	gent.absmax[1] += 1;
	gent.absmax[2] += 1;

	/*// link to PVS leafs
	ent.numClusters = 0;
	ent.lastCluster = 0;
	ent.areanum = -1;
	ent.areanum2 = -1;

	// get all leafs, including solids
	num_leafs = CM_BoxLeafnums( gEnt->r.absmin, gEnt->r.absmax,
		leafs, MAX_TOTAL_ENT_LEAFS, &lastLeaf );

	// if none of the leafs were inside the map, the
	// entity is outside the world and can be considered unlinked
	if (!num_leafs) {
		return;
	}

	// set areas, even from clusters that don't fit in the entity array
	for (var i = 0; i < num_leafs; i++) {
		var area = CM_LeafArea(leafs[i]);

		if (area === -1) {
			continue;
		}

		// doors may legally straggle two areas,
		// but nothing should ever need more than that
		if (ent.areanum !== -1 && ent.areanum != area) {
			ent.areanum2 = area;
		} else {
			ent.areanum = area;
		}
	}

	// store as many explicit clusters as we can
	ent.numClusters = 0;

	for (var i = 0; i < num_leafs; i++) {
		var cluster = CM_LeafCluster(leafs[i]);

		if (cluster === -1) {
			continue;
		}

		ent.clusternums[ent.numClusters++] = cluster;

		if (ent.numClusters == MAX_ENT_CLUSTERS) {
			break;
		}
	}

	// store off a last cluster if we need to
	if (i !== num_leafs) {
		ent.lastCluster = CM_LeafCluster( lastLeaf );
	}*/

	// find the first world sector node that the ent's box crosses
	var node = worldSectors[0];

	while (1) {
		if (node.axis == -1) {
			break;
		}

		if (gent.absmin[node.axis] > node.dist) {
			node = node.children[0];
		}
		else if (gent.absmax[node.axis] < node.dist) {
			node = node.children[1];
		}
		else {
			break; // crosses the node
		}
	}
	
	// link it in
	gent.linked = true;
	ent.worldSector = node;
	node.entities[ent.number] = ent;
}

function UnlinkEntity(gent) {
	var ent = SvEntityForGentity(gent);
	var node = ent.worldSector;

	if (!node) {
		return; // not linked in anywhere
	}

	// unlink
	gent.linked = false;
	delete node.entities[ent.number];
	ent.worldSector = null;
}


	return {
		Init:             Init,
		Frame:            Frame,
		PacketEvent:      PacketEvent,
		ClientConnect:    ClientConnect
	};
});
