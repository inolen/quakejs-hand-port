define('cgame/cg',
['underscore', 'glmatrix', 'game/bg'],
function (_, glmatrix, bg) {
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
	var DEFAULT_GRAVITY = 800;
var JUMP_VELOCITY = 270;
var MAX_CLIP_PLANES = 5;
var MIN_WALK_NORMAL = 0.7;
var STEPSIZE = 18;
var OVERCLIP = 1.001;
var DEFAULT_VIEWHEIGHT = 26;
var ITEM_RADIUS = 15;                            // item sizes are needed for client side pickup detection

/**********************************************************
 * Game item descriptions
 **********************************************************/
var ItemType = {
	BAD:                0,
	WEAPON:             1,                       // EFX: rotate + upscale + minlight
	AMMO:               2,                       // EFX: rotate
	ARMOR:              3,                       // EFX: rotate + minlight
	HEALTH:             4,                       // EFX: static external sphere + rotating internal
	POWERUP:            5,                       // instant on, timer based
	                                             // EFX: rotate + external ring that rotates
	HOLDABLE:           6,                       // single use, holdable item
	                                             // EFX: rotate + bob
	PERSISTANT_POWERUP: 7,
	TEAM:               8
};

var GameItemDesc = function (classname, giType) {
	this.classname = classname;                  // spawning name
	/*char		*pickup_sound;
	char		*world_model[MAX_ITEM_MODELS];

	char		*icon;
	char		*pickup_name;	// for printing on pickup

	int			quantity;		// for ammo how much, or duration of powerup*/
	this.giType    = giType;                     // IT_* flags
	/*int			giTag;

	char		*precaches;		// string of all models and images this item will use
	char		*sounds;		// string of all sounds this item will use*/
};

/**********************************************************
 * Entity state related
 **********************************************************/
// entityState_t->eType
var EntityType = {
	GENERAL:          0,
	PLAYER:           1,
	ITEM:             2,
	MISSILE:          3,
	MOVER:            4,
	BEAM:             5,
	PORTAL:           6,
	SPEAKER:          7,
	PUSH_TRIGGER:     8,
	TELEPORT_TRIGGER: 9,
	INVISIBLE:        10,
	GRAPPLE:          11,                        // grapple hooked on wall
	TEAM:             12,
	EVENTS:           13                         // any of the EV_* events can be added freestanding
	                                             // by setting eType to ET_EVENTS + eventNum
	                                             // this avoids having to set eFlags and eventNum
};

// entityState_t->eFlags
var EntityFlags = {
	DEAD:             0x00000001,                // don't draw a foe marker over players with EF_DEAD
	TELEPORT_BIT:     0x00000004,                // toggled every time the origin abruptly changes
	AWARD_EXCELLENT:  0x00000008,                // draw an excellent sprite
	PLAYER_EVENT:     0x00000010,
	BOUNCE:           0x00000010,                // for missiles
	BOUNCE_HALF:      0x00000020,                // for missiles
	AWARD_GAUNTLET:   0x00000040,                // draw a gauntlet sprite
	NODRAW:           0x00000080,                // may have an event, but no model (unspawned items)
	FIRING:           0x00000100,                // for lightning gun
	KAMIKAZE:         0x00000200,
	MOVER_STOP:       0x00000400,                // will push otherwise
	AWARD_CAP:        0x00000800,                // draw the capture sprite
	TALK:             0x00001000,                // draw a talk balloon
	CONNECTION:       0x00002000,                // draw a connection trouble sprite
	VOTED:            0x00004000,                // already cast a vote
	AWARD_IMPRESSIVE: 0x00008000,                // draw an impressive sprite
	AWARD_DEFEND:     0x00010000,                // draw a defend sprite
	AWARD_ASSIST:     0x00020000,                // draw an assist sprite
	AWARD_DENIED:     0x00040000,                // denied
	TEAMVOTED:        0x00080000                 // already cast a team vote
};

/**********************************************************
 * Pmove related
 **********************************************************/
var ContentTypes = {
	SOLID:         1,                            // an eye is never valid in a solid
	LAVA:          8,
	SLIME:         16,
	WATER:         32,
	FOG:           64,

	NOTTEAM1:      0x0080,
	NOTTEAM2:      0x0100,
	NOBOTCLIP:     0x0200,

	AREAPORTAL:    0x8000,

	PLAYERCLIP:    0x10000,
	MONSTERCLIP:   0x20000,
	TELEPORTER:    0x40000,
	JUMPPAD:       0x80000,
	CLUSTERPORTAL: 0x100000,
	DONOTENTER:    0x200000,
	BOTCLIP:       0x400000,
	MOVER:         0x800000,

	ORIGIN:        0x1000000,                    // removed before bsping an entity

	BODY:          0x2000000,                    // should never be on a brush, only in game
	CORPSE:        0x4000000,
	DETAIL:        0x8000000,                    // brushes not used for the bsp
	STRUCTURAL:    0x10000000,                   // brushes used for the bsp
	TRANSLUCENT:   0x20000000,                   // don't consume surface fragments inside
	TRIGGER:       0x40000000,
	NODROP:        0x80000000                    // don't leave bodies or items (death fog, lava)
};

var ContentMasks = {
	ALL:         -1,
	SOLID:       ContentTypes.SOLID,
	PLAYERSOLID: ContentTypes.SOLID | ContentTypes.PLAYERCLIP  | ContentTypes.BODY,
	DEADSOLID:   ContentTypes.SOLID | ContentTypes.PLAYERCLIP,
	WATER:       ContentTypes.WATER | ContentTypes.LAVA        | ContentTypes.SLIME,
	OPAQUE:      ContentTypes.SOLID | ContentTypes.SLIME       | ContentTypes.LAVA,
	SHOT:        ContentTypes.SOLID | ContentTypes.BODY       | ContentTypes.CORPSE,
};

var PmoveType = {
	NORMAL:       0,                             // can accelerate and turn
	NOCLIP:       1,                             // noclip movement
	SPECTATOR:    2,                             // still run into walls
	DEAD:         3,                             // no acceleration or turning, but free falling
	FREEZE:       4,                             // stuck in place with no control
	INTERMISSION: 5                              // no movement or status bar
};

var PmoveFlags = {
	DUCKED:         1,
	JUMP_HELD:      2,
	BACKWARDS_JUMP: 8,                           // go into backwards land
	BACKWARDS_RUN:  16,                          // coast down to backwards run
	TIME_LAND:      32,                          // pm_time is time before rejump
	TIME_KNOCKBACK: 64,                          // pm_time is an air-accelerate only time
	TIME_WATERJUMP: 256,                         // pm_time is waterjump
	RESPAWNED:      512,                         // clear after attack and jump buttons come up
	USE_ITEM_HELD:  1024,
	GRAPPLE_PULL:   2048,                        // pull towards grapple location
	FOLLOW:         4096,                        // spectate following another player
	SCOREBOARD:     8192,                        // spectate as a scoreboard
	INVULEXPAND:    16384                        // invulnerability sphere set to full size
};

var PmoveInfo = function () {
	this.ps = null;
	this.cmd = null;
	this.frameTime = 0;
	this.mins = [0, 0, 0];
	this.maxs = [0, 0, 0];
	//this.tracemask = 0;                          // collide against these surfaces
	//this.framecount = 0;

	// results (out)
	//this.numtouch = 0;
	//this.touchents = null; //[MAXTOUCH];

	// callbacks to test the world
	// these will be different functions during game and cgame
	this.trace = null;
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
	var clinterface;

var cg;
var cgs;
var cg_errordecay;
var cg_showmiss;

function Init(clinterface, serverMessageNum) {
	console.log('--------- CG Init ---------');

	cl = clinterface;

	cg = new ClientGame();
	cgs = new ClientGameStatic();

	cg_errordecay = cl.AddCvar('cg_errordecay', 100);
	cg_predict = cl.AddCvar('cg_predict', 0);
	cg_showmiss = cl.AddCvar('cg_showmiss', 1);

	cgs.processedSnapshotNum = serverMessageNum;
	cgs.gameState = cl.GetGameState();
	
	cl.LoadClipMap(cgs.gameState['sv_mapname'], function () {
		cl.LoadRenderMap(cgs.gameState['sv_mapname'], function () {
			cg.initialized = true;
		});
	});
}

function Shutdown() {
	console.log('--------- CG Shutdown ---------');
}

function Frame(serverTime) {
	if (!cg.initialized) {
		return;
	}
	
	cg.time = serverTime;
	
	ProcessSnapshots(); 

	if (!cg.snap || (cg.snap.snapFlags & SNAPFLAG_NOT_ACTIVE)) {
		//CG_DrawInformation();
		return;
	}

	PredictPlayerState();
	
	CalcViewValues();
	cg.refdef.time = cg.time;

	if (!cg.hyperspace) {
		AddPacketEntities();
	}
	
	cl.RenderScene(cg.refdef);
	DrawFPS();
}

function CalcViewValues() {
	var ps = cg.predictedPlayerState;

	cg.refdef.x = 0;
	cg.refdef.y = 0;
	cg.refdef.width = viewport.width;
	cg.refdef.height = viewport.height;
	vec3.set(ps.origin, cg.refdef.vieworg);
	AnglesToAxis(ps.viewangles, cg.refdef.viewaxis);

	// Add error decay.
	// if (cg_errorDecay() > 0) {
	// 	var t = cg.time - cg.predictedErrorTime;
	// 	var f = (cg_errorDecay() - t) / cg_errorDecay();
	// 	if (f > 0 && f < 1) {
	// 		VectorMA( cg.refdef.vieworg, f, cg.predictedError, cg.refdef.vieworg );
	// 	} else {
	// 		cg.predictedErrorTime = 0;
	// 	}
	// }

	OffsetFirstPersonView();
	CalcFov();
}

function OffsetFirstPersonView() {
	// add view height
	cg.refdef.vieworg[2] += DEFAULT_VIEWHEIGHT;//ps.viewheight;
}

function CalcFov() {
	var fovX = 90;
	var x = cg.refdef.width / Math.tan(fovX / 360 * Math.PI);
	var fovY = Math.atan2(cg.refdef.height, x) * 360 / Math.PI;

	cg.refdef.fovX = fovX;
	cg.refdef.fovY = fovY;
}
	var FPS_FRAMES    = 4;
var fpsElement    = null;
var previousTimes = new Array(FPS_FRAMES);
var previousTime  = 0;
var previousIdx   = 0;

function DrawFPS() {
	var t = cl.GetMilliseconds();
	var frameTime = t - previousTime;
	previousTime = t;

	previousTimes[previousIdx % FPS_FRAMES] = frameTime;
	previousIdx++;

	if (previousIdx > FPS_FRAMES) {
		// average multiple frames together to smooth changes out a bit
		var total = 0;

		for (var i = 0; i < FPS_FRAMES; i++) {
			total += previousTimes[i];
		}

		if (!total) {
			total = 1;
		}

		var fps = parseInt(1000 * FPS_FRAMES / total);

		if (!fpsElement) {
			fpsElement = cl.CreateElement();
		}
		
		cl.DrawText(fpsElement, cg.refdef.width - 48, 5, fps + 'fps');
	}
}
	function AddPacketEntities() {
	// set cg.frameInterpolation
	if (cg.nextSnap) {
		var delta = (cg.nextSnap.serverTime - cg.snap.serverTime);
		if (delta === 0) {
			cg.frameInterpolation = 0;
		} else {
			cg.frameInterpolation = (cg.time - cg.snap.serverTime ) / delta;
		}
	} else {
		cg.frameInterpolation = 0;	// actually, it should never be used, because 
									// no entities should be marked as interpolating
	}

	/*// generate and add the entity from the playerstate
	var ps = cg.predictedPlayerState;
	BG_PlayerStateToEntityState( ps, &cg.predictedPlayerEntity.currentState, qfalse );
	CG_AddCEntity( &cg.predictedPlayerEntity );

	// lerp the non-predicted value for lightning gun origins
	CG_CalcEntityLerpPositions( &cg_entities[ cg.snap->ps.clientNum ] );*/

	// add each entity sent over by the server
	for (var i = 0; i < cg.snap.numEntities; i++) {
		var cent = cg.entities[cg.snap.entities[i].number];
		AddCEntity(cent);
	}
}

function AddCEntity(cent) {
	// Event-only entities will have been dealt with already.
	if (cent.currentState.eType >= EntityType.EVENTS) {
		return;
	}
	
	// Calculate the current origin.
	CalcEntityLerpPositions(cent);

	//if (cent.currentState.eType === EntityType.ITEM) {
	if (cent.currentState.number !== cg.predictedPlayerState.clientNum) {
		var refent = new RefEntity();

		refent.reType = RefEntityType.BBOX;
		vec3.set(cent.lerpOrigin, refent.origin);
		vec3.set([-ITEM_RADIUS, -ITEM_RADIUS, -ITEM_RADIUS], refent.mins);
		vec3.set([ITEM_RADIUS, ITEM_RADIUS, ITEM_RADIUS], refent.maxs);

		cl.AddRefEntityToScene(refent);
	}
	//}

	// add automatic effects
	//CG_EntityEffects( cent );

	/*switch ( cent->currentState.eType ) {
	default:
		CG_Error( "Bad entity type: %i", cent->currentState.eType );
		break;
	case EntityType.INVISIBLE:
	case EntityType.PUSH_TRIGGER:
	case EntityType.TELEPORT_TRIGGER:
		break;
	case EntityType.GENERAL:
		CG_General( cent );
		break;
	case EntityType.PLAYER:
		CG_Player( cent );
		break;
	case EntityType.ITEM:
		CG_Item( cent );
		break;
	case EntityType.MISSILE:
		CG_Missile( cent );
		break;
	case EntityType.MOVER:
		CG_Mover( cent );
		break;
	case EntityType.BEAM:
		CG_Beam( cent );
		break;
	case EntityType.PORTAL:
		CG_Portal( cent );
		break;
	case EntityType.SPEAKER:
		CG_Speaker( cent );
		break;
	case EntityType.GRAPPLE:
		CG_Grapple( cent );
		break;
	case EntityType.TEAM:
		CG_TeamBase( cent );
		break;
	}*/
}

function CalcEntityLerpPositions(cent) {
	// Make sure the clients use TrajectoryType.INTERPOLATE.
	if (cent.currentState.number < MAX_CLIENTS) {
		cent.currentState.pos.trType = TrajectoryType.INTERPOLATE;
		cent.nextState.pos.trType = TrajectoryType.INTERPOLATE;
	}

	if (cent.interpolate && cent.currentState.pos.trType === TrajectoryType.INTERPOLATE) {
		InterpolateEntityPosition(cent);
		return;
	}

	// First see if we can interpolate between two snaps for
	// linear extrapolated clients
	if (cent.interpolate &&
		cent.currentState.pos.trType === TrajectoryType.LINEAR_STOP &&
		cent.currentState.number < MAX_CLIENTS) {
		InterpolateEntityPosition(cent);
		return;
	}

	// Just use the current frame and evaluate as best we can
	bg.EvaluateTrajectory(cent.currentState.pos, cg.time, cent.lerpOrigin);
	bg.EvaluateTrajectory(cent.currentState.apos, cg.time, cent.lerpAngles);

	// adjust for riding a mover if it wasn't rolled into the predicted
	// player state
	/*if ( cent != &cg.predictedPlayerEntity ) {
		CG_AdjustPositionForMover( cent->lerpOrigin, cent->currentState.groundEntityNum, 
		cg.snap->serverTime, cg.time, cent->lerpOrigin, cent->lerpAngles, cent->lerpAngles);
	}*/
}

function InterpolateEntityPosition(cent) {
	// It would be an internal error to find an entity that interpolates without
	// a snapshot ahead of the current one
	if (!cg.nextSnap) {
		throw new Error('InterpoateEntityPosition: !cg.nextSnap');
	}

	var f = cg.frameInterpolation;

	// This will linearize a sine or parabolic curve, but it is important
	// to not extrapolate player positions if more recent data is available
	var current = vec3.create();
	var next = vec3.create();

	bg.EvaluateTrajectory(cent.currentState.pos, cg.snap.serverTime, current);
	bg.EvaluateTrajectory(cent.nextState.pos, cg.nextSnap.serverTime, next);

	cent.lerpOrigin[0] = current[0] + f * (next[0] - current[0]);
	cent.lerpOrigin[1] = current[1] + f * (next[1] - current[1]);
	cent.lerpOrigin[2] = current[2] + f * (next[2] - current[2]);

	bg.EvaluateTrajectory(cent.currentState.apos, cg.snap.serverTime, current);
	bg.EvaluateTrajectory(cent.nextState.apos, cg.nextSnap.serverTime, next);

	cent.lerpAngles[0] = LerpAngle(current[0], next[0], f);
	cent.lerpAngles[1] = LerpAngle(current[1], next[1], f);
	cent.lerpAngles[2] = LerpAngle(current[2], next[2], f);

}

	function TransitionPlayerState(ps, ops) {
	// check for changing follow mode
	/*if (ps.clientNum !== ops.clientNum) {
		cg.thisFrameTeleport = qtrue;
		// make sure we don't get any unwanted transition effects
		*ops = *ps;
	}*/

	// damage events (player is getting wounded)
	/*if ( ps->damageEvent != ops->damageEvent && ps->damageCount ) {
		CG_DamageFeedback( ps->damageYaw, ps->damagePitch, ps->damageCount );
	}*/

	// respawning
	/*if ( ps->persistant[PERS_SPAWN_COUNT] != ops->persistant[PERS_SPAWN_COUNT] ) {
		CG_Respawn();
	}*/

	/*if ( cg.mapRestart ) {
		CG_Respawn();
		cg.mapRestart = qfalse;
	}*/

	/*if ( cg.snap->ps.pm_type != PM_INTERMISSION 
		&& ps->persistant[PERS_TEAM] != TEAM_SPECTATOR ) {
		CG_CheckLocalSounds( ps, ops );
	}*/

	// check for going low on ammo
	//CG_CheckAmmo();

	// run events
	//CG_CheckPlayerstateEvents( ps, ops );

	/*// smooth the ducking viewheight change
	if ( ps->viewheight != ops->viewheight ) {
		cg.duckChange = ps->viewheight - ops->viewheight;
		cg.duckTime = cg.time;
	}*/
}
	function InterpolatePlayerState(grabAngles) {
	var ps = cg.predictedPlayerState = cg.snap.ps.clone();
	var prev = cg.snap;
	var next = cg.nextSnap;

	// If we are still allowing local input, short circuit the view angles.
	if (grabAngles) {
		var cmdNum = cl.GetCurrentUserCommandNumber();
		var cmd = cl.GetUserCommand(cmdNum);
		bg.UpdateViewAngles(ps, cmd);
	}

	// If the next frame is a teleport, we can't lerp to it.
	if (cg.nextFrameTeleport) {
		return;
	}

	if (!next || next.serverTime <= prev.serverTime) {
		return;
	}

	var f = (cg.time - prev.serverTime) / (next.serverTime - prev.serverTime);

	/*i = next->ps.bobCycle;
	if ( i < prev->ps.bobCycle ) {
		i += 256;		// handle wraparound
	}
	out->bobCycle = prev->ps.bobCycle + f * ( i - prev->ps.bobCycle );*/

	for (var i = 0; i < 3; i++) {
		ps.origin[i] = prev.ps.origin[i] + f * (next.ps.origin[i] - prev.ps.origin[i]);
		if (!grabAngles) {
			ps.viewangles[i] = LerpAngle(prev.ps.viewangles[i], next.ps.viewangles[i], f);
		}
		ps.velocity[i] = prev.ps.velocity[i] + f * (next.ps.velocity[i] - prev.ps.velocity[i]);
	}
}

function PredictPlayerState() {
	cg.hyperspace = false;	// will be set if touching a trigger_teleport

	// If this is the first frame we must guarantee predictedPlayerState 
	// is valid even if there is some other error condition.
	if (!cg.validPPS) {
		cg.validPPS = true;
		cg.predictedPlayerState = cg.snap.ps.clone();
	}

	// Just copy the moves when following.
	if (cg.snap.ps.pm_flags & PmoveFlags.FOLLOW) {
		InterpolatePlayerState(false);
		return;
	}

	if (cg_predict()) {
 		InterpolatePlayerState(true);
 		return;
	}

	// Save the state before the pmove so we can detect transitions.
	var oldPlayerState = cg.predictedPlayerState.clone();

	// If we don't have the commands right after the snapshot, we
	// can't accurately predict a current position, so just freeze at
	// the last good position we had.
	var latest = cl.GetCurrentUserCommandNumber();
	var oldest = latest - CMD_BACKUP + 1;
	var oldestCmd = cl.GetUserCommand(oldest);

	// Special check for map_restart.
	if (oldestCmd.serverTime > cg.snap.ps.commandTime && oldestCmd.serverTime < cg.time) {
		if (cg_showmiss()) {
			console.log('exceeded PACKET_BACKUP on commands');
		}
		return;
	}

	// Get the latest command so we can know which commands are from previous map_restarts.
	var latestCmd = cl.GetUserCommand(latest);

	// Get the most recent information we have, even if the server time
	// is beyond our current cg.time, because predicted player positions
	// are going to be ahead of everything else anyway.
	if (cg.nextSnap && !cg.nextFrameTeleport && !cg.thisFrameTeleport) {
		cg.predictedPlayerState = cg.nextSnap.ps.clone();
		cg.physicsTime = cg.nextSnap.serverTime;
	} else {
		cg.predictedPlayerState = cg.snap.ps.clone();
		cg.physicsTime = cg.snap.serverTime;
	}

	// Prepare for pmove.
	var cg_pmove = new PmoveInfo();
	cg_pmove.ps = cg.predictedPlayerState;
	cg_pmove.trace = cl.Trace;
	// cg_pmove.pointcontents = CG_PointContents;
	if (cg_pmove.ps.pm_type === PmoveType.DEAD) {
		cg_pmove.tracemask = ContentMasks.PLAYERSOLID & ~ContentTypes.BODY;
	} else {
		cg_pmove.tracemask = ContentMasks.PLAYERSOLID;
	}
	// if (cg.snap->ps.persistant[PERS_TEAM] == TEAM_SPECTATOR) {
	// 	cg_pmove.tracemask &= ~ContentTypes.BODY;	// spectators can fly through bodies
	// }
	// cg_pmove.noFootsteps = ( cgs.dmflags & DF_NO_FOOTSTEPS ) > 0;

	// Run cmds.
	var moved = false;
	for (var cmdNum = oldest; cmdNum <= latest; cmdNum++) {
		// Get the command.
		cg_pmove.cmd = cl.GetUserCommand(cmdNum);

		// Don't do anything if the time is before the snapshot player time.
		if (cg_pmove.cmd.serverTime <= cg.predictedPlayerState.commandTime) {
			continue;
		}

		// Don't do anything if the command was from a previous map_restart.
		if (cg_pmove.cmd.serverTime > latestCmd.serverTime) {
			continue;
		}

		// Check for a prediction error from last frame on a lan, this will often
		// be the exact value from the snapshot, but on a wan we will have to
		// predict several commands to get to the point we want to compare.
		// if (cg.predictedPlayerState.commandTime === oldPlayerState.commandTime) {
		// 	if (cg.thisFrameTeleport) {
		// 		// A teleport will not cause an error decay
		// 		cg.predictedError = [0, 0, 0];
		// 		if (cg_showmiss()) {
		// 			console.log('PredictionTeleport');
		// 		}
		// 		cg.thisFrameTeleport = false;
		// 	} else {
		// 		vec3_t adjusted, new_angles;
		// 		CG_AdjustPositionForMover( cg.predictedPlayerState.origin, 
		// 			cg.predictedPlayerState.groundEntityNum, cg.physicsTime, cg.oldTime, adjusted, cg.predictedPlayerState.viewangles, new_angles);

		// 		if (cg_showmiss()) {
		// 			if (oldPlayerState.origin[0] !== adjusted[0] ||
		// 				oldPlayerState.origin[1] !== adjusted[1]
		// 				oldPlayerState.origin[2] !== adjusted[2]) {
		// 				console.log('Prediction error');
		// 			}
		// 		}
		// 		var delta = vec3.subtract(oldPlayerState.origin, adjusted, [0, 0, 0]);
		// 		var len = vec3.length(delta);
		// 		if (len > 0.1) {
		// 			if (cg_showmiss()) {
		// 				console.log('Prediction miss: ' + len);
		// 			}
		// 			if (cg_errorDecay()) {
		// 				var t = cg.time - cg.predictedErrorTime;
		// 				var f = (cg_errorDecay() - t) / cg_errorDecay();
		// 				if (f < 0) {
		// 					f = 0;
		// 				} else if (f > 0 && cg_showmiss()) {
		// 					console.log('Double prediction decay: ' + f);
		// 				}
		// 				vec3.scale(cg.predictedError, f);
		// 			} else {
		// 				cg.predictedError = [0, 0, 0];
		// 			}
		// 			VectorAdd( delta, cg.predictedError, cg.predictedError );
		// 			cg.predictedErrorTime = cg.oldTime;
		// 		}
		// 	}
		// }

		// don't predict gauntlet firing, which is only supposed to happen
		// when it actually inflicts damage
		//cg_pmove.gauntletHit = qfalse;
		
		bg.Pmove(cg_pmove);

		moved = true;

		// add push trigger movement effects
		//CG_TouchTriggerPrediction();
	}

	if (cg_showmiss() > 1) {
		console.log('[' + cg_pmove.cmd.serverTime + ' : ' + cg.time + ']');
	}

	if (!moved) {
		if (cg_showmiss()) {
			console.log("not moved");
		}
		return;
	}

	// adjust for the movement of the groundentity
	/*CG_AdjustPositionForMover( cg.predictedPlayerState.origin, 
		cg.predictedPlayerState.groundEntityNum, 
		cg.physicsTime, cg.time, cg.predictedPlayerState.origin, cg.predictedPlayerState.viewangles, cg.predictedPlayerState.viewangles);

	if (cg_showmiss()) {
		if (cg.predictedPlayerState.eventSequence > oldPlayerState.eventSequence + MAX_PS_EVENTS) {
			CG_Printf("WARNING: dropped event\n");
		}
	}

	// fire events and other transition triggered things
	CG_TransitionPlayerState( &cg.predictedPlayerState, &oldPlayerState );

	if (cg_showmiss()) {
		if (cg.eventSequence > cg.predictedPlayerState.eventSequence) {
			console.log('WARNING: double event');
			cg.eventSequence = cg.predictedPlayerState.eventSequence;
		}
	}*/
}
	function ProcessSnapshots() {
	var snap;

	// See what the latest snapshot the client system has is.
	var info = cl.GetCurrentSnapshotNumber();

	cg.latestSnapshotTime = info.serverTime;

	if (info.snapshotNumber !== cg.latestSnapshotNum) {
		if (info.snapshotNumber < cg.latestSnapshotNum) {
			// this should never happen
			throw new Error('ProcessSnapshots: info.snapshotNumber < cg.latestSnapshotNum');
		}

		cg.latestSnapshotNum = info.snapshotNumber;
	}

	// If we have yet to receive a snapshot, check for it.
	// Once we have gotten the first snapshot, cg.snap will
	// always have valid data for the rest of the game.
	while (!cg.snap) {
		snap = ReadNextSnapshot();

		if (!snap) {
			// we can't continue until we get a snapshot
			return;
		}

		if (!(snap.snapFlags & SNAPFLAG_NOT_ACTIVE)) {
			SetInitialSnapshot(snap);
		}
	}

	// Loop until we either have a valid nextSnap with a serverTime
	// greater than cg.time to interpolate towards, or we run
	// out of available snapshots.
	while (true) {
		// If we don't have a nextframe, try and read a new one in.
		if (!cg.nextSnap) {
			snap = ReadNextSnapshot();

			// If we still don't have a nextframe, we will just have to extrapolate.
			if (!snap) {
				break;
			}

			SetNextSnap(snap);

			// If time went backwards, we have a level restart.
			if (cg.nextSnap.serverTime < cg.snap.serverTime ) {
				throw new Error('ProcessSnapshots: Server time went backwards');
			}
		}

		// if our time is < nextFrame's, we have a nice interpolating state.
		if (cg.time >= cg.snap.serverTime && cg.time < cg.nextSnap.serverTime) {
			break;
		}

		// we have passed the transition from nextFrame to frame
		TransitionSnapshot();
	};

	// Assert our valid conditions upon exiting
	if (cg.snap === null) {
		throw new Error('ProcessSnapshots: cg.snap == NULL');
	}

	if (cg.time < cg.snap.serverTime) {
		// this can happen right after a vid_restart
		cg.time = cg.snap.serverTime;
	}

	if (cg.nextSnap && cg.nextSnap.serverTime <= cg.time ) {
		throw new Error('ProcessSnapshots: cg.nextSnap.serverTime <= cg.time');
	}

	/*if (!cg.nextSnap) {
		console.log('ProcessSnapshots: No valid nextSnap.');
	}*/
}

function ReadNextSnapshot() {
	if (cg.latestSnapshotNum > cgs.processedSnapshotNum + 1000) {
		console.warn('ReadNextSnapshot: way out of range, ' + cg.latestSnapshotNum + ' > ' + cgs.processedSnapshotNum);
	}

	while (cgs.processedSnapshotNum < cg.latestSnapshotNum) {
		// try to read the snapshot from the client system
		cgs.processedSnapshotNum++;
		var snap = cl.GetSnapshot(cgs.processedSnapshotNum);

		// if it succeeded, return
		if (snap) {
			return snap;
		}

		// GetSnapshot will return failure if the snapshot
		// never arrived, or  is so old that its entities
		// have been shoved off the end of the circular
		// buffer in the client system.

		// If there are additional snapshots, continue trying to
		// read them.
	}

	// nothing left to read
	return null;
}

function SetInitialSnapshot(snap) {
	cg.snap = snap;

	console.log('Setting initial snapshot');

	for (var i = 0; i < cg.snap.numEntities; i++) {
		var state = cg.snap.entities[i];
		var cent = cg.entities[state.number];

		state.clone(cent.currentState);

		cent.interpolate = false;
		cent.currentValid = true;

		ResetEntity(cent);

		// check for events
		//CheckEvents( cent );
	}
}

function SetNextSnap(snap) {
	cg.nextSnap = snap;

	bg.PlayerStateToEntityState(snap.ps, cg.entities[snap.ps.clientNum].nextState);
	cg.entities[cg.snap.ps.clientNum].interpolate = true;

	// check for extrapolation errors
	for (var i = 0; i < snap.numEntities; i++) {
		var state = snap.entities[i];
		var cent = cg.entities[state.number];

		state.clone(cent.nextState);

		// if this frame is a teleport, or the entity wasn't in the previous frame, don't interpolate
		if (!cent.currentValid || ((cent.currentState.eFlags ^ state.eFlags) & EntityFlags.TELEPORT_BIT)) {
			cent.interpolate = false;
		} else {
			cent.interpolate = true;
		}
	}

	// If the next frame is a teleport for the playerstate, we can't interpolate.
	if (cg.snap && ((snap.ps.eFlags ^ cg.snap.ps.eFlags) & EntityFlags.TELEPORT_BIT)) {
		cg.nextFrameTeleport = true;
	} else {
		cg.nextFrameTeleport = false;
	}

	// if changing server restarts, don't interpolate.
	if ((cg.nextSnap.snapFlags ^ cg.snap.snapFlags) & SNAPFLAG_SERVERCOUNT) {
		cg.nextFrameTeleport = true;
	}
}

/**
 * TransitionSnapshot
 *
 * The transition point from snap to nextSnap has passed.
 */
function TransitionSnapshot() {
	if (!cg.snap) {
		throw new Error('TransitionSnapshot: NULL cg.snap');
	}
	if (!cg.nextSnap) {
		throw new Error('TransitionSnapshot: NULL cg.nextSnap');
	}

	// execute any server string commands before transitioning entities
	//ExecuteNewServerCommands(cg.nextSnap.serverCommandSequence);

	// clear the currentValid flag for all entities in the existing snapshot
	/*for (var i = 0; i < cg.snap.numEntities; i++) {
		cent = &cg_entities[cg.snap.entities[i].number];
		cent.currentValid = false;
	}*/

	// move nextSnap to snap and do the transitions
	var oldFrame = cg.snap;
	cg.snap = cg.nextSnap;

	bg.PlayerStateToEntityState(cg.snap.ps, cg.entities[cg.snap.ps.clientNum].currentState);
	cg.entities[cg.snap.ps.clientNum].interpolate = false;

	for (var i = 0; i < cg.snap.numEntities; i++) {
		var cent = cg.entities[cg.snap.entities[i].number];
		
		TransitionEntity(cent);

		// Remember time of snapshot this entity was last updated in.
		cent.snapShotTime = cg.snap.serverTime;
	}

	cg.nextSnap = null;

	/*// check for playerstate transition events
	if (oldFrame) {
		var ops = oldFrame.ps;
		var ps = cg.snap.ps;

		// teleporting checks are irrespective of prediction
		if ((ps.eFlags ^ ops.eFlags) & EntityFlags.TELEPORT_BIT) {
			cg.thisFrameTeleport = true; // will be cleared by prediction code
		}

		// if we are not doing client side movement prediction for any
		// reason, then the client events and view changes will be issued now
		if ((cg.snap.ps.pm_flags & PmoveFlags.FOLLOW)) {
			CG_TransitionPlayerState(ps, ops);
		}
	}*/
}

function ResetEntity(cent) {
	/*// If the previous snapshot this entity was updated in is at least
	// an event window back in time then we can reset the previous event.
	if (cent.snapShotTime < cg.time - EVENT_VALID_MSEC) {
		cent.previousEvent = 0;
	}

	cent->trailTime = cg.snap->serverTime;*/

	vec3.set(cent.currentState.origin, cent.lerpOrigin);
	vec3.set(cent.currentState.angles, cent.lerpAngles);

	/*if (cent.currentState.eType === EntityType.PLAYER) {
		ResetPlayerEntity(cent);
	}*/
}

/*
===============
TransitionEntity

cent->nextState is moved to cent->currentState and events are fired
===============
*/
function TransitionEntity(cent) {
	cent.currentState = cent.nextState;
	cent.currentValid = true;

	// Reset if the entity wasn't in the last frame or was teleported.
	if (!cent.interpolate) {
		ResetEntity(cent);
	}

	// Clear the next state. It will be set by the next SetNextSnap.
	cent.interpolate = false;

	// check for events
	//CG_CheckEvents( cent );
}


	return {
		Init: Init,
		Shutdown: Shutdown,
		Frame: Frame
	};
});
