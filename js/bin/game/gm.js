define('game/gm',
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
	var sys;
var sv;

var level;

var g_gravity;

function Init(sv_) {
	sys = require('system/sys');
	sv = sv_;

	level = new LevelLocals();

	g_gravity = sv.AddCvar('g_gravity', 800);

	// Let the server system know where the entites are.
	sv.LocateGameData(level.gentities, level.clients);

	// Spawn all the entities for the current level.
	SpawnAllEntitiesFromDefs();
}

function Shutdown() {
}

function Frame(levelTime) {
	level.framenum++;
	level.previousTime = level.time;
	level.time = levelTime;

	for (var i = 0; i < level.gentities.length; i++) {
		var ent = level.gentities[i];

		if (!ent) {
			continue;
		}
		
		/*if (i < MAX_CLIENTS) {
			ClientThink(ent.client.number);
			continue;
		}*/

		EntityThink(ent);
	}
}
	
/*
============
TouchTriggers

Find all trigger entities that ent's current position touches.
Spectators will only interact with teleporters.
============
*/
function TouchTriggers(ent) {
	if (!ent.client) {
		return;
	}

	var ps = ent.client.ps;
	var range = [40, 40, 52];
	var mins = [0, 0, 0], maxs = [0, 0, 0];
	vec3.subtract(ps.origin, range, mins);
	vec3.add(ps.origin, range, maxs);

	var entityNums = sv.FindEntitiesInBox(mins, maxs);

	/*// can't use ent->absmin, because that has a one unit pad
	vec3.add(ps.origin, ent.r.mins, mins);
	vec3.add(ps.origin, ent.r.maxs, maxs);*/

	for (var i = 0; i < entityNums.length; i++) {
		var hit = level.gentities[entityNums[i]];

		// If they don't have callbacks.
		if (!hit.touch) {
			continue;
		}

		if (!(hit.contents & ContentTypes.TRIGGER)) {
			continue;
		}

		/*if (!trap_EntityContact(mins, maxs, hit) ) {
			continue;
		}*/

		hit.touch.call(this, hit, ent);
	}

	// if we didn't touch a jump pad this pmove frame
	if (ps.jumppad_frame != ps.pmove_framecount) {
		ps.jumppad_frame = 0;
		ps.jumppad_ent = 0;
	}
}
	var playerMins = [-15, -15, -24];
var playerMaxs = [15, 15, 32];

function ClientBegin(clientNum) {
	var client = level.clients[clientNum] = new GameClient();
	var ent = level.gentities[clientNum] = new GameEntity();

	ent.client = client;
	ent.s.number = clientNum;
	ent.client.ps.clientNum = clientNum;

	ClientSpawn(ent);
}

function ClientThink(clientNum, cmd) {
	var client = level.clients[clientNum];
	var ent = level.gentities[clientNum];

	// sanity check the command time to prevent speedup cheating
	if (cmd.serverTime > level.time + 200) {
		cmd.serverTime = level.time + 200;
	}
	if (cmd.serverTime < level.time - 1000) {
		cmd.serverTime = level.time - 1000;
	}

	client.ps.gravity = g_gravity();
	client.ps.speed = 320;

	var pm = new PmoveInfo();
	pm.ps = client.ps;
	pm.cmd = cmd;
	pm.tracemask = ContentMasks.PLAYERSOLID;
	pm.trace = sv.Trace;
	bg.Pmove(pm);

	// Save results of pmove.
	bg.PlayerStateToEntityState(ent.client.ps, ent.s);

	// Update game entity info.
	vec3.set(client.ps.origin, ent.currentOrigin);
	vec3.set(pm.mins, ent.mins);
	vec3.set(pm.maxs, ent.maxs);
	sv.LinkEntity(ent);

	TouchTriggers(ent);

	// NOTE: now copy the exact origin over otherwise clients can be snapped into solid
	//VectorCopy( ent->client->ps.origin, ent->r.currentOrigin );
}

function GetClientPlayerstate(clientNum) {
	var client = level.clients[clientNum];
	return client.ps;
}

function ClientSpawn(ent) {
	var client = ent.client;
	var ps = ent.client.ps;

	ent.classname = 'player';
	ent.contents = ContentTypes.BODY;
	ent.s.groundEntityNum = ENTITYNUM_NONE;

	var spawnpoint = SelectRandomDeathmatchSpawnPoint();

	vec3.set(spawnpoint.s.origin, ps.origin);
	ps.origin[2] += 70;
	vec3.set(ps.velocity, [0, 0, 0]);
}

/**
 * ClientDisconnect
 *
 * Called when a player drops from the server, will not be
 * called between levels.
 * This should NOT be called directly by any game logic,
 * call sv.DropClient(), which will call this and do
 * server system housekeeping.
 */
function ClientDisconnect(clientNum) {
	var ent = level.gentities[clientNum];

	if (!ent.client/* || ent.client.pers.connected == CON_DISCONNECTED*/) {
		return;
	}

	console.log('ClientDisconnect: ' + clientNum);

	sv.UnlinkEntity (ent);
	ent.s.modelindex = 0;
	ent.classname = 'disconnected';
	/*ent.client.pers.connected = CON_DISCONNECTED;
	ent.client.ps.persistant[PERS_TEAM] = TEAM_FREE;
	ent.client.sess.sessionTeam = TEAM_FREE;
	trap_SetConfigstring( CS_PLAYERS + clientNum, "");*/
}

function SelectNearestDeathmatchSpawnPoint(from) {
	var nearestDist = 999999;
	var nearestSpot = null;
	var spawnpoints = FindEntity('classname', 'info_player_deathmatch');

	for (var i = 0; i < spawnpoints.length; i++) {
		var spawnpoint = spawnpoints[i];
		var dist = vec3.length(vec3.subtract(spawnpoint.origin, from, [0, 0, 0]));

		if (dist < nearestDist) {
			nearestDist = dist;
			nearestSpot = spawnpoint;
		}
	}

	return nearestSpot;
}

function SelectRandomDeathmatchSpawnPoint() {
	var spawnpoints = FindEntity('classname', 'info_player_deathmatch');
	return spawnpoints[Math.floor(Math.random()*spawnpoints.length)];
}
	var entityEvents = {};

var keyMap = {
	'origin': ['s.origin', 'currentOrigin']
}

function SpawnEntity() {
	for (var i = MAX_CLIENTS; i < MAX_GENTITIES; i++) {
		if (level.gentities[i]) {
			continue;
		}

		var ent = level.gentities[i] = new GameEntity();
		ent.s.number = i;
		return ent;
	}

	throw new Error('Game entities is full');
}

function FreeEntity(ent) {
	sv.UnlinkEntity(ent); // unlink from world
	delete level.gentities[ent.s.number];
}

function FindEntity(key, value) {
	var results = [];

	for (var i = 0; i < level.gentities.length; i++) {
		var ent = level.gentities[i];

		if (!ent) {
			continue;
		}

		if (ent[key] === value) {
			results.push(ent);
		}
	}

	return results;
}

function EntityThink(ent) {
	var thinktime = ent.nextthink;

	if (thinktime <= 0) {
		return;
	} else if (thinktime > level.time) {
		return;
	}
	
	ent.nextthink = 0;

	if (!ent.think) {
		throw new Error('NULL ent->think');
	}

	ent.think.call(this, ent);
}

function EntityPickTarget(targetName) {
	if (!targetName) {
		throw new Error('SV: EntityPickTarget called with NULL targetname');
	}

	var choices = FindEntity('targetname', targetName);

	if (!choices.length) {
		throw new Error('SV: EntityPickTarget: target ' + targetName + ' not found');
	}

	return choices[Math.floor(Math.random()*choices.length)];
}

function SpawnEntityFromDef(def) {
	var ent = SpawnEntity();

	// Merge definition info into the entity.
	for (var defKey in def) {
		if (!def.hasOwnProperty(defKey)) {
			continue;
		}

		// Use the mapping if it exists.
		var entKeys = keyMap[defKey] || [defKey];

		// Set all mapped keys.
		for (var i = 0; i < entKeys.length; i++) {
			var entKey = entKeys[i];

			// Don't merge keys that aren't expected.
			// TODO Do we have to use eval?
			var val = eval('ent.' + entKey);
			if (val === undefined) {
				continue;
			}
			eval('ent.' + entKey + ' = def[defKey]');
		}
	}

	// Merge entity-specific callbacks in.
	if (entityEvents[ent.classname]) {
		_.extend(ent, entityEvents[ent.classname]);
	}

	// Call spawn function if it exists.
	var item;
	var spawn;

	// See if we should spawn this as an item.
	if ((item = bg.ItemList[ent.classname])) {
		SpawnItem(ent, item);
		return;
	}

	if (ent.spawn) {
		ent.spawn.call(this, ent);
	}
}

function SpawnAllEntitiesFromDefs() {
	var entityDefs = sv.GetEntityDefs();

	for (var i = 0; i < entityDefs.length; i++) {
		var def = entityDefs[i];
		SpawnEntityFromDef(def);
	}
}
	/**
 * SpawnItem
 *
 * Sets the clipping size and plants the object on the floor.
 * Items can't be immediately dropped to floor, because they might
 * be on an entity that hasn't spawned yet.
 */
function SpawnItem(ent, item) {
	ent.item = item;
	// Some movers spawn on the second frame, so delay item
	// spawns until the third frame so they can ride trains.
	ent.nextthink = level.time + FRAMETIME * 2;
	ent.think = FinishSpawningItem;

	//ent.physicsBounce = 0.50;		// items are bouncy

	/*if (item->giType == IT_POWERUP ) {
		G_SoundIndex( "sound/items/poweruprespawn.wav" );
		G_SpawnFloat( "noglobalsound", "0", &ent->speed);
	}*/
}

/**
 * FinishSpawningItem
 *
 * Traces down to find where an item should rest, instead of letting them
 * free fall from their spawn points
 */
function FinishSpawningItem(ent) {
	vec3.set([-ITEM_RADIUS, -ITEM_RADIUS, -ITEM_RADIUS], ent.mins);
	vec3.set([ITEM_RADIUS, ITEM_RADIUS, ITEM_RADIUS], ent.maxs);

	ent.s.eType = EntityType.ITEM;
	//ent.s.modelindex = ent->item - bg_itemlist;		// store item number in modelindex
	//ent.s.modelindex2 = 0; // zero indicates this isn't a dropped item

	ent.contents = ContentTypes.TRIGGER;
	//ent.touch = Touch_Item;
	//ent->use = Use_Item;

	if (ent.spawnflags & 1) {
		// suspended
		// TODO figure out why we need G_SetOrigin and the trajectory fields
		//G_SetOrigin( ent, ent->s.origin );
	} else {
		// drop to floor
		/*var dest = vec3.create([ent.s.origin[0], ent.s.origin[1], ent.s.origin[2] - 4096]);

		trap_Trace( &tr, ent->s.origin, ent->r.mins, ent->r.maxs, dest, ent->s.number, MASK_SOLID );
		if ( tr.startsolid ) {
			G_Printf ("FinishSpawningItem: %s startsolid at %s\n", ent->classname, vtos(ent->s.origin));
			G_FreeEntity( ent );
			return;
		}

		// allow to ride movers
		ent->s.groundEntityNum = tr.entityNum;

		G_SetOrigin( ent, tr.endpos );*/
	}

	/*// team slaves and targeted items aren't present at start
	if ( ( ent->flags & FL_TEAMSLAVE ) || ent->targetname ) {
		ent->s.eFlags |= EF_NODRAW;
		ent->r.contents = 0;
		return;
	}

	// powerups don't spawn in for a while
	if ( ent->item->giType == IT_POWERUP ) {
		float	respawn;

		respawn = 45 + crandom() * 15;
		ent->s.eFlags |= EF_NODRAW;
		ent->r.contents = 0;
		ent->nextthink = level.time + respawn * 1000;
		ent->think = RespawnItem;
		return;
	}*/

	sv.LinkEntity(ent);
}

	function AimAtTarget(self) {
	var origin = vec3.add(self.absmin, self.absmax, [0, 0, 0]);
	vec3.scale(origin, 0.5);

	var ent = EntityPickTarget(self.target);
	if (!ent) {
		FreeEntity(self);
		return;
	}

	var height = ent.s.origin[2] - origin[2];
	var gravity = g_gravity();
	var time = Math.sqrt(height / (0.5 * gravity));
	if (!time) {
		FreeEntity(self);
		return;
	}

	// set s.origin2 to the push velocity
	vec3.subtract(ent.s.origin, origin, self.s.origin2 );
	self.s.origin2[2] = 0;

	var dist = vec3.length(self.s.origin2);
	vec3.normalize(self.s.origin2);

	var forward = dist / time;
	vec3.scale(self.s.origin2, forward);

	self.s.origin2[2] = time * gravity;
}
	entityEvents['trigger_push'] = {
	spawn: function (self) {
		sv.SetBrushModel(self, self.model);

		self.s.eType = EntityType.PUSH_TRIGGER;
		self.contents = ContentTypes.TRIGGER;
		self.nextthink = level.time + FRAMETIME;
		
		sv.LinkEntity(self);
	},

	think: function (self) {
		AimAtTarget(self);
	},

	touch: function (self, other) {
		if (!other.client) {
			return;
		}

		bg.TouchJumpPad(other.client.ps, self.s);
	}
};

	return {
		Init:                 Init,
		Shutdown:             Shutdown,
		Frame:                Frame,
		ClientBegin:          ClientBegin,
		ClientThink:          ClientThink,
		ClientDisconnect:     ClientDisconnect,
		GetClientPlayerstate: GetClientPlayerstate
	};
});
